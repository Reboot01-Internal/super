package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

var rebootAdminTokenCache = struct {
	sync.Mutex
	token     string
	expiresAt time.Time
}{}

func rebootSchoolURL() string {
	return strings.TrimRight(strings.TrimSpace(os.Getenv("SCHOOL_URL")), "/")
}

func rebootBootstrapToken() string {
	return strings.TrimSpace(os.Getenv("TOKEN"))
}

func rebootSchoolEmail() string {
	return strings.TrimSpace(os.Getenv("SCHOOL_EMAIL"))
}

func rebootSchoolPassword() string {
	return strings.TrimSpace(os.Getenv("SCHOOL_PASSWORD"))
}

func parseRebootToken(body []byte) string {
	var tokenString string
	if err := json.Unmarshal(body, &tokenString); err == nil {
		return strings.TrimSpace(tokenString)
	}

	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return strings.Trim(strings.TrimSpace(string(body)), `"`)
	}
	for _, key := range []string{"token", "access_token", "jwt"} {
		if value, ok := payload[key].(string); ok && strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	if nested, ok := payload["data"].(map[string]any); ok {
		for _, key := range []string{"token", "access_token", "jwt"} {
			if value, ok := nested[key].(string); ok && strings.TrimSpace(value) != "" {
				return strings.TrimSpace(value)
			}
		}
	}
	return ""
}

func getRebootAdminToken() (string, error) {
	schoolURL := rebootSchoolURL()
	bootstrapToken := rebootBootstrapToken()
	schoolEmail := rebootSchoolEmail()
	schoolPassword := rebootSchoolPassword()
	if schoolURL == "" || (bootstrapToken == "" && (schoolEmail == "" || schoolPassword == "")) {
		return "", fmt.Errorf("SCHOOL_URL and TOKEN or SCHOOL_EMAIL/SCHOOL_PASSWORD are required")
	}

	rebootAdminTokenCache.Lock()
	if rebootAdminTokenCache.token != "" && time.Now().Before(rebootAdminTokenCache.expiresAt) {
		token := rebootAdminTokenCache.token
		rebootAdminTokenCache.Unlock()
		log.Printf("avatar: using cached reboot admin token")
		return token, nil
	}
	rebootAdminTokenCache.Unlock()

	var req *http.Request
	var err error
	if bootstrapToken != "" {
		log.Printf("avatar: requesting reboot admin token using TOKEN at %s", schoolURL)
		u, err := url.Parse(schoolURL + "/api/auth/token")
		if err != nil {
			return "", err
		}
		q := u.Query()
		q.Set("token", bootstrapToken)
		u.RawQuery = q.Encode()

		req, err = http.NewRequest(http.MethodGet, u.String(), nil)
		if err != nil {
			return "", err
		}
	} else {
		log.Printf("avatar: requesting reboot admin token using SCHOOL_EMAIL at %s", schoolURL)
		req, err = http.NewRequest(http.MethodPost, schoolURL+"/api/auth/signin", nil)
		if err != nil {
			return "", err
		}
		encoded := base64.StdEncoding.EncodeToString([]byte(schoolEmail + ":" + schoolPassword))
		req.Header.Set("Authorization", "Basic "+encoded)
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("avatar: admin token request failed: %v", err)
		return "", err
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		log.Printf("avatar: admin token request returned status %d", res.StatusCode)
		return "", fmt.Errorf("admin token request failed")
	}
	token := parseRebootToken(body)
	if token == "" {
		log.Printf("avatar: admin token response did not include a token")
		return "", fmt.Errorf("admin token response did not include a token")
	}

	rebootAdminTokenCache.Lock()
	rebootAdminTokenCache.token = token
	rebootAdminTokenCache.expiresAt = time.Now().Add(20 * time.Minute)
	rebootAdminTokenCache.Unlock()

	log.Printf("avatar: reboot admin token loaded")
	return token, nil
}

func avatarFileIDFromAttrs(attrs any) string {
	switch value := attrs.(type) {
	case map[string]any:
		if fileID, ok := value["pro-picUploadId"].(string); ok {
			return strings.TrimSpace(fileID)
		}
	case string:
		var parsed map[string]any
		if err := json.Unmarshal([]byte(value), &parsed); err == nil {
			return avatarFileIDFromAttrs(parsed)
		}
	}
	return ""
}

func fetchRebootAvatarFileID(adminToken, login string) (string, error) {
	schoolURL := rebootSchoolURL()
	if schoolURL == "" {
		return "", fmt.Errorf("SCHOOL_URL is required")
	}

	query := `
		query avatar_by_login($login: String!) {
			user(where: { login: { _eq: $login } }, limit: 1) {
				login
				attrs
			}
		}
	`
	payload := map[string]any{
		"query":     query,
		"variables": map[string]any{"login": login},
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest(http.MethodPost, schoolURL+"/api/graphql-engine/v1/graphql", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+adminToken)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("avatar: graphql request failed for login=%s: %v", login, err)
		return "", err
	}
	defer res.Body.Close()

	resBody, _ := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		log.Printf("avatar: graphql returned status %d for login=%s", res.StatusCode, login)
		return "", fmt.Errorf("avatar query failed")
	}

	var parsed struct {
		Data struct {
			User []struct {
				Attrs any `json:"attrs"`
			} `json:"user"`
		} `json:"data"`
		Errors []any `json:"errors"`
	}
	if err := json.Unmarshal(resBody, &parsed); err != nil {
		log.Printf("avatar: graphql response parse failed for login=%s: %v", login, err)
		return "", err
	}
	if len(parsed.Errors) > 0 {
		log.Printf("avatar: graphql returned errors for login=%s", login)
		return "", fmt.Errorf("avatar query returned errors")
	}
	if len(parsed.Data.User) == 0 {
		log.Printf("avatar: no reboot user found for login=%s", login)
		return "", nil
	}
	fileID := avatarFileIDFromAttrs(parsed.Data.User[0].Attrs)
	if fileID == "" {
		log.Printf("avatar: no pro-picUploadId found for login=%s", login)
	} else {
		log.Printf("avatar: found avatar file for login=%s", login)
	}
	return fileID, nil
}

func (a *API) AdminRebootAvatar(w http.ResponseWriter, r *http.Request) {
	login := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("login")))
	if login == "" {
		http.Error(w, "login required", http.StatusBadRequest)
		return
	}
	log.Printf("avatar: request login=%s", login)

	adminToken, err := getRebootAdminToken()
	if err != nil {
		log.Printf("avatar: service not configured or token unavailable for login=%s: %v", login, err)
		http.Error(w, "avatar service is not configured", http.StatusServiceUnavailable)
		return
	}

	fileID, err := fetchRebootAvatarFileID(adminToken, login)
	if err != nil || fileID == "" {
		log.Printf("avatar: avatar not found for login=%s err=%v", login, err)
		http.Error(w, "avatar not found", http.StatusNotFound)
		return
	}

	schoolURL := rebootSchoolURL()
	u, err := url.Parse(schoolURL + "/api/storage")
	if err != nil {
		http.Error(w, "bad storage url", http.StatusInternalServerError)
		return
	}
	q := u.Query()
	q.Set("token", adminToken)
	q.Set("fileId", fileID)
	u.RawQuery = q.Encode()

	res, err := http.Get(u.String())
	if err != nil {
		log.Printf("avatar: storage fetch failed for login=%s: %v", login, err)
		http.Error(w, "avatar fetch failed", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		log.Printf("avatar: storage returned status %d for login=%s", res.StatusCode, login)
		http.Error(w, "avatar fetch failed", http.StatusBadGateway)
		return
	}

	contentType := res.Header.Get("Content-Type")
	if strings.TrimSpace(contentType) == "" {
		contentType = "image/jpeg"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=3600")
	log.Printf("avatar: serving login=%s content_type=%s", login, contentType)
	_, _ = io.Copy(w, res.Body)
}
