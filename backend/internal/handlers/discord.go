package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"taskflow/internal/db"
	"taskflow/internal/discord"
)

const discordSyncTimeout = 10 * time.Second

func (a *API) syncBoardDiscordChannel(boardID int64) bool {
	if a.discord == nil || !a.discord.Enabled() {
		return false
	}

	board, err := db.GetBoardBasic(a.conn, boardID)
	if err != nil {
		log.Printf("discord sync skipped: board %d not found: %v", boardID, err)
		return false
	}

	members, err := db.ListBoardDiscordMembers(a.conn, boardID)
	if err != nil {
		log.Printf("discord sync skipped: board %d members query failed: %v", boardID, err)
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), discordSyncTimeout)
	defer cancel()

	access := make([]discord.MemberAccess, 0, len(members))
	for _, member := range members {
		discordUserID := strings.TrimSpace(member.DiscordUserID)
		if discordUserID == "" && strings.TrimSpace(member.Nickname) != "" {
			resolvedID, err := a.discord.ResolveMemberByNickname(ctx, member.Nickname)
			if err != nil {
				log.Printf("discord nickname resolve failed for board %d user %d nickname %q: %v", boardID, member.UserID, member.Nickname, err)
			} else if resolvedID != "" {
				if err := db.UpdateUserDiscordID(a.conn, member.UserID, resolvedID); err != nil {
					log.Printf("discord user id save failed for board %d user %d: %v", boardID, member.UserID, err)
				} else {
					discordUserID = resolvedID
				}
			}
		}
		if discordUserID == "" {
			continue
		}
		access = append(access, discord.MemberAccess{
			DiscordUserID: discordUserID,
		})
	}

	channelID, err := db.GetBoardDiscordChannelID(a.conn, boardID)
	if err == sql.ErrNoRows {
		channelID, err = a.discord.CreateBoardChannel(ctx, board.Name, access)
		if err != nil {
			log.Printf("discord channel create failed for board %d: %v", boardID, err)
			return false
		}
		if err := db.UpsertBoardDiscordChannel(a.conn, boardID, channelID); err != nil {
			log.Printf("discord channel mapping save failed for board %d: %v", boardID, err)
			return false
		}
		return true
	}
	if err != nil {
		log.Printf("discord channel lookup failed for board %d: %v", boardID, err)
		return false
	}

	if err := a.discord.UpdateBoardChannel(ctx, channelID, board.Name, access); err != nil {
		log.Printf("discord channel update failed for board %d: %v", boardID, err)
		return false
	}
	return true
}

func (a *API) notifyCardAssigned(cardID, userID, actorID int64) bool {
	if a.discord == nil || !a.discord.Enabled() {
		return false
	}

	boardID, err := db.GetBoardIDByCardID(a.conn, cardID)
	if err != nil || boardID == 0 {
		log.Printf("discord assignment notify skipped: board lookup failed for card %d: %v", cardID, err)
		return false
	}

	_ = a.syncBoardDiscordChannel(boardID)

	channelID, err := db.GetBoardDiscordChannelID(a.conn, boardID)
	if err != nil || strings.TrimSpace(channelID) == "" {
		log.Printf("discord assignment notify skipped: channel lookup failed for board %d: %v", boardID, err)
		return false
	}

	board, err := db.GetBoardBasic(a.conn, boardID)
	if err != nil {
		log.Printf("discord assignment notify skipped: board query failed for board %d: %v", boardID, err)
		return false
	}

	card, err := db.GetCard(a.conn, cardID)
	if err != nil {
		log.Printf("discord assignment notify skipped: card query failed for card %d: %v", cardID, err)
		return false
	}

	assigneeName, _, _, _, err := db.GetUserBasic(a.conn, userID)
	if err != nil {
		log.Printf("discord assignment notify skipped: assignee query failed for user %d: %v", userID, err)
		return false
	}

	actorName := "Someone"
	if actorID > 0 {
		if fullName, _, _, _, err := db.GetUserBasic(a.conn, actorID); err == nil && strings.TrimSpace(fullName) != "" {
			actorName = fullName
		}
	}

	assigneeMention := assigneeName
	if discordUserID, err := db.GetUserDiscordID(a.conn, userID); err == nil && strings.TrimSpace(discordUserID) != "" {
		assigneeMention = "<@" + strings.TrimSpace(discordUserID) + ">"
	}

	message := fmt.Sprintf("%s assigned %s to **%s** in **%s**.", actorName, assigneeMention, card.Title, board.Name)

	ctx, cancel := context.WithTimeout(context.Background(), discordSyncTimeout)
	defer cancel()

	if err := a.discord.SendChannelMessage(ctx, channelID, message); err != nil {
		log.Printf("discord assignment notify failed for card %d user %d: %v", cardID, userID, err)
		return false
	}

	return true
}
