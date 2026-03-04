package middleware

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"taskflow/internal/utils"
)

type ctxKey string

const (
	ctxUserID ctxKey = "user_id"
	ctxRole   ctxKey = "role"
)

// Minimal JWT payload we care about (decoded only, not verified)
type jwtPayload struct {
	Exp  int64  `json:"exp"`
	Role string `json:"role"`
	// some tokens use different shapes, we try best-effort
	UserID int64 `json:"user_id"`
	Sub    string `json:"sub"`
}

// RequireAuth: just checks Bearer token exists.
// Optionally decodes payload to set ctx user_id / role (WITHOUT signature verification).
func RequireAuth(_ string, _ any) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if h == "" || !strings.HasPrefix(h, "Bearer ") {
				utils.WriteJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing token"})
				return
			}

			tokenStr := strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
			if tokenStr == "" {
				utils.WriteJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing token"})
				return
			}

			uid, role := decodeTokenBestEffort(tokenStr)

			ctx := context.WithValue(r.Context(), ctxUserID, uid)
			ctx = context.WithValue(ctx, ctxRole, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			got, _ := r.Context().Value(ctxRole).(string)
			if strings.ToLower(strings.TrimSpace(got)) != strings.ToLower(strings.TrimSpace(role)) {
				utils.WriteJSON(w, http.StatusForbidden, map[string]any{"error": "forbidden"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func UserID(r *http.Request) int64 {
	id, _ := r.Context().Value(ctxUserID).(int64)
	return id
}

func Role(r *http.Request) string {
	role, _ := r.Context().Value(ctxRole).(string)
	return role
}

// ---- helpers ----

func decodeTokenBestEffort(token string) (int64, string) {
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return 0, ""
	}

	payloadB64 := parts[1]
	// base64url -> base64
	payloadB64 = strings.ReplaceAll(payloadB64, "-", "+")
	payloadB64 = strings.ReplaceAll(payloadB64, "_", "/")
	switch len(payloadB64) % 4 {
	case 2:
		payloadB64 += "=="
	case 3:
		payloadB64 += "="
	}

	b, err := base64.StdEncoding.DecodeString(payloadB64)
	if err != nil {
		return 0, ""
	}

	var p map[string]any
	if err := json.Unmarshal(b, &p); err != nil {
		return 0, ""
	}

	// Try role
	role := ""
	if v, ok := p["role"].(string); ok {
		role = strings.ToLower(strings.TrimSpace(v))
	}
	// some systems store role nested
	if role == "" {
		if u, ok := p["user"].(map[string]any); ok {
			if v, ok := u["role"].(string); ok {
				role = strings.ToLower(strings.TrimSpace(v))
			}
		}
	}

	// Try user_id
	var uid int64 = 0
	if v, ok := p["user_id"].(float64); ok {
		uid = int64(v)
	}

	// If no role found, keep empty (your frontend can still route)
	return uid, role
}