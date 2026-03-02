package models

type CardActivity struct {
	ID          int64  `json:"id"`
	CardID      int64  `json:"card_id"`
	ActorUserID int64  `json:"actor_user_id"`
	ActorName   string `json:"actor_name"`
	Action      string `json:"action"`
	Meta        string `json:"meta"`
	CreatedAt   string `json:"created_at"`
}