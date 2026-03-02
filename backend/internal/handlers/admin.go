package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"taskflow/internal/auth"
	"taskflow/internal/db"
	"taskflow/internal/middleware"
	"taskflow/internal/models"
	"taskflow/internal/utils"
)

/*
ADMIN: Create user (supervisor/student)
POST /admin/users
*/
type createUserReq struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"` // supervisor|student
}

func (a *API) AdminCreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserReq
	if err := utils.ReadJSON(r, &req); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "bad json"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FullName = strings.TrimSpace(req.FullName)
	req.Password = strings.TrimSpace(req.Password)
	req.Role = strings.TrimSpace(strings.ToLower(req.Role))

	if req.FullName == "" || req.Email == "" || req.Password == "" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "full_name, email, password required"})
		return
	}

	if req.Role != "supervisor" && req.Role != "student" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "role must be supervisor or student"})
		return
	}

	passHash, err := auth.HashPassword(req.Password)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "password hash error"})
		return
	}

	userID, err := db.CreateUser(a.conn, req.FullName, req.Email, passHash, req.Role)
	if err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "email already exists or invalid"})
		return
	}

	// auto-create supervisor file
	if req.Role == "supervisor" {
		if err := db.EnsureSupervisorFile(a.conn, userID); err != nil {
			utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to create supervisor file"})
			return
		}
	}

	utils.WriteJSON(w, http.StatusCreated, map[string]any{
		"id":   userID,
		"role": req.Role,
	})
}

/*
ADMIN: List supervisors (with file id)
GET /admin/supervisors
*/
func (a *API) AdminListSupervisors(w http.ResponseWriter, r *http.Request) {
	rows, err := a.conn.Query(`
		SELECT u.id, u.full_name, u.email, sf.id, sf.created_at
		FROM users u
		JOIN supervisor_files sf ON sf.supervisor_user_id = u.id
		WHERE u.role = 'supervisor' AND u.is_active = 1
		ORDER BY u.full_name ASC
	`)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()

	out := []models.SupervisorRow{}
	for rows.Next() {
		var s models.SupervisorRow
		if err := rows.Scan(&s.SupervisorUserID, &s.FullName, &s.Email, &s.FileID, &s.CreatedAt); err != nil {
			utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "scan error"})
			return
		}
		out = append(out, s)
	}

	utils.WriteJSON(w, http.StatusOK, out)
}

/*
ADMIN: Create board inside a supervisor file
POST /admin/boards
*/
type createBoardReq struct {
	SupervisorFileID int64  `json:"supervisor_file_id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
}

func (a *API) AdminCreateBoard(w http.ResponseWriter, r *http.Request) {
	var req createBoardReq
	if err := utils.ReadJSON(r, &req); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "bad json"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)

	if req.SupervisorFileID == 0 || req.Name == "" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "supervisor_file_id and name required"})
		return
	}

	createdBy := middleware.UserID(r)
	boardID, err := db.CreateBoard(a.conn, req.SupervisorFileID, req.Name, req.Description, createdBy)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to create board"})
		return
	}

	// Optional: auto-add creator as member (admin)
	_ = db.AddBoardMember(a.conn, boardID, createdBy, "owner")

	utils.WriteJSON(w, http.StatusCreated, map[string]any{"id": boardID})
}

/*
ADMIN: List boards by supervisor file
GET /admin/boards?file_id=123
*/
func (a *API) AdminListBoardsByFile(w http.ResponseWriter, r *http.Request) {
	fileIDStr := r.URL.Query().Get("file_id")
	if fileIDStr == "" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "file_id is required"})
		return
	}

	fileID, err := strconv.ParseInt(fileIDStr, 10, 64)
	if err != nil || fileID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid file_id"})
		return
	}

	boards, err := db.ListBoardsBySupervisorFile(a.conn, fileID)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, boards)
}

/*
ADMIN: Add/Update board member
POST /admin/board-members
*/
type addMemberReq struct {
	BoardID     int64  `json:"board_id"`
	UserID      int64  `json:"user_id"`
	RoleInBoard string `json:"role_in_board"` // member/lead/owner...
}

func (a *API) AdminAddBoardMember(w http.ResponseWriter, r *http.Request) {
	var req addMemberReq
	if err := utils.ReadJSON(r, &req); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "bad json"})
		return
	}

	if req.BoardID == 0 || req.UserID == 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "board_id and user_id required"})
		return
	}

	req.RoleInBoard = strings.TrimSpace(req.RoleInBoard)
	if req.RoleInBoard == "" {
		req.RoleInBoard = "member"
	}

	if err := db.AddBoardMember(a.conn, req.BoardID, req.UserID, req.RoleInBoard); err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to add member"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

/*
ADMIN: List board members
GET /admin/board-members?board_id=55
*/
func (a *API) AdminListBoardMembers(w http.ResponseWriter, r *http.Request) {
	boardIDStr := r.URL.Query().Get("board_id")
	if boardIDStr == "" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "board_id is required"})
		return
	}

	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil || boardID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid board_id"})
		return
	}

	members, err := db.ListBoardMembers(a.conn, boardID)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, members)
}

/*
ADMIN: Search students
GET /admin/students?q=reem
*/
func (a *API) AdminSearchStudents(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	users, err := db.SearchUsersByRole(a.conn, "student", q)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, users)
}