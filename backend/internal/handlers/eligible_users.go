package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"taskflow/internal/db"
	"taskflow/internal/utils"
)

// ADMIN: eligible users for a board
// GET /admin/eligible-users?board_id=1&role=all|student|supervisor&q=abc
func (a *API) AdminEligibleUsers(w http.ResponseWriter, r *http.Request) {
	boardIDStr := r.URL.Query().Get("board_id")
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	role := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("role")))

	boardID, err := strconv.ParseInt(boardIDStr, 10, 64)
	if err != nil || boardID <= 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid board_id"})
		return
	}

	// board -> supervisor owner
	supID, err := db.GetBoardSupervisorUserID(a.conn, boardID)
	if err != nil || supID == 0 {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "board has no supervisor"})
		return
	}

	// default is all
	if role == "" {
		role = "all"
	}

	// students: must be assigned to that supervisor
	if role == "student" || role == "all" {
		students, err := db.ListEligibleStudentsForSupervisor(a.conn, supID, q)
		if err != nil {
			utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}

		// supervisors: any active supervisor (search by q)
		if role == "student" {
			utils.WriteJSON(w, http.StatusOK, students)
			return
		}

		supervisors, err := db.ListEligibleSupervisors(a.conn, q)
		if err != nil {
			utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}

		// merge (students first, then supervisors)
		out := make([]any, 0, len(students)+len(supervisors))
		for _, u := range students {
			out = append(out, u)
		}
		for _, u := range supervisors {
			out = append(out, u)
		}
		utils.WriteJSON(w, http.StatusOK, out)
		return
	}

	if role == "supervisor" {
		supervisors, err := db.ListEligibleSupervisors(a.conn, q)
		if err != nil {
			utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
			return
		}
		utils.WriteJSON(w, http.StatusOK, supervisors)
		return
	}

	utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "role must be all, student, or supervisor"})
}