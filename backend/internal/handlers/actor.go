package handlers

import (
	"net/http"

	"taskflow/internal/middleware"
)

const DevActorID int64 = 1 // seeded admin user id

func actorID(r *http.Request) int64 {
	id := middleware.UserID(r) 
	if id <= 0 {
		return DevActorID
	}
	return id
}