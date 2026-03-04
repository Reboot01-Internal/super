package handlers

import (
	"net/http"
	"strings"

	"taskflow/internal/utils"
)

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *API) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := utils.ReadJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	pass := req.Password

	// ✅ HARD CODED USERS (change however you want)
	// Admin
	if email == "admin@local.test" && pass == "Admin123!" {
		writeJSON(w, http.StatusOK, map[string]any{
			"role": "admin",
		})
		return
	}

	// Supervisor example
	if email == "supervisor@local.test" && pass == "Supervisor123!" {
		writeJSON(w, http.StatusOK, map[string]any{
			"role": "supervisor",
		})
		return
	}

	// Student example
	if email == "student@local.test" && pass == "Student123!" {
		writeJSON(w, http.StatusOK, map[string]any{
			"role": "student",
		})
		return
	}

	writeErr(w, http.StatusUnauthorized, "invalid credentials")
}

func (a *API) Me(w http.ResponseWriter, r *http.Request) {
	// No JWT anymore, so just return something simple
	writeJSON(w, http.StatusOK, map[string]any{
		"message": "no-auth mode",
	})
}