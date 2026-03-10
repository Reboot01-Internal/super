package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"taskflow/internal/discord"
)

type API struct {
	conn    *sql.DB
	discord *discord.Service
}

func NewAPI(conn *sql.DB, discordSvc *discord.Service) *API {
	return &API{conn: conn, discord: discordSvc}
}

// Shared JSON helpers (use everywhere)
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{
		"ok":    false,
		"error": msg,
	})
}
