package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"taskflow/internal/db"
	"taskflow/internal/middleware"
	"taskflow/internal/utils"
)

// ADMIN: eligible students for a board (assigned to that board's supervisor)
// GET /admin/eligible-students?board_id=1&q=abc
func (a *API) AdminEligibleStudents(w http.ResponseWriter, r *http.Request) {
	boardIDStr := r.URL.Query().Get("board_id")
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil || boardID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid board_id"})
		return
	}

	supID, err := db.GetBoardSupervisorUserID(a.conn, boardID)
	if err != nil || supID == 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "board has no supervisor"})
		return
	}

	users, err := db.ListEligibleStudentsForSupervisor(a.conn, supID, q)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, users)
}

// SUPERVISOR: eligible students for their board
// GET /supervisor/eligible-students?board_id=1&q=abc
func (a *API) SupervisorEligibleStudents(w http.ResponseWriter, r *http.Request) {
	boardIDStr := r.URL.Query().Get("board_id")
	q := strings.TrimSpace(r.URL.Query().Get("q"))

	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil || boardID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid board_id"})
		return
	}

	supID, err := db.GetBoardSupervisorUserID(a.conn, boardID)
	if err != nil || supID == 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "board has no supervisor"})
		return
	}

	actor := middleware.UserID(r)
	if actor != supID {
		utils.WriteJSON(w, http.StatusForbidden, map[string]any{"error": "not your board"})
		return
	}

	users, err := db.ListEligibleStudentsForSupervisor(a.conn, supID, q)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, users)
}

// SUPERVISOR: add member (only assigned students + only their boards)
// POST /supervisor/board-members
func (a *API) SupervisorAddBoardMember(w http.ResponseWriter, r *http.Request) {
	var req addMemberReq
	if err := utils.ReadJSON(r, &req); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "bad json"})
		return
	}

	if req.BoardID == 0 || req.UserID == 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "board_id and user_id required"})
		return
	}

	boardSupID, err := db.GetBoardSupervisorUserID(a.conn, req.BoardID)
	if err != nil || boardSupID == 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "board has no supervisor"})
		return
	}

	actor := middleware.UserID(r)
	if actor != boardSupID {
		utils.WriteJSON(w, http.StatusForbidden, map[string]any{"error": "not your board"})
		return
	}

	targetRole, err := db.GetUserRole(a.conn, req.UserID)
	if err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid user"})
		return
	}
	if strings.ToLower(targetRole) != "student" {
		utils.WriteJSON(w, http.StatusForbidden, map[string]any{"error": "only students can be added"})
		return
	}

	ok, err := db.IsStudentAssignedToSupervisor(a.conn, boardSupID, req.UserID)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	if !ok {
		utils.WriteJSON(w, http.StatusForbidden, map[string]any{"error": "student not assigned to you"})
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