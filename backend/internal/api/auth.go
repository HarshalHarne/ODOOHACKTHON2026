package api

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
)

type Role string

const (
	RoleAdmin          Role = "admin"
	RoleAssetManager   Role = "asset_manager"
	RoleDepartmentHead Role = "department_head"
	RoleEmployee       Role = "employee"
	RoleUser           Role = "employee"
)

type Principal struct {
	UserID        string
	Role          Role
	Authenticated bool
}

type jwtClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func SetPrincipal(c fiber.Ctx, p Principal) {
	c.Locals("principal", p)
	c.Locals("employeeID", p.UserID)
	c.Locals("role", string(p.Role))
}

func GetPrincipal(c fiber.Ctx) (Principal, bool) {
	p, ok := c.Locals("principal").(Principal)
	return p, ok
}

func JWTMiddleware(secret string) fiber.Handler {
	jwtSecret := []byte(secret)

	return func(c fiber.Ctx) error {
		if principal, ok := GetPrincipal(c); ok && principal.Authenticated {
			return c.Next()
		}

		authHeader := strings.TrimSpace(c.Get("Authorization"))
		if authHeader == "" {
			return writeError(c, fiber.StatusUnauthorized, "unauthorized", "Authentication is required.")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
			return writeError(c, fiber.StatusUnauthorized, "unauthorized", "Authentication is required.")
		}

		token, err := jwt.ParseWithClaims(strings.TrimSpace(parts[1]), &jwtClaims{}, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			return writeError(c, fiber.StatusUnauthorized, "unauthorized", "Authentication is required.")
		}

		claims, ok := token.Claims.(*jwtClaims)
		if !ok || claims.Subject == "" || strings.TrimSpace(claims.Role) == "" {
			return writeError(c, fiber.StatusUnauthorized, "unauthorized", "Authentication is required.")
		}

		SetPrincipal(c, Principal{
			UserID:        claims.Subject,
			Role:          Role(claims.Role),
			Authenticated: true,
		})

		return c.Next()
	}
}

func RequireAdmin(c fiber.Ctx) error {
	p, ok := GetPrincipal(c)
	if !ok || !p.Authenticated {
		return writeError(c, fiber.StatusUnauthorized, "unauthorized", "Authentication is required.")
	}
	if p.Role != RoleAdmin {
		return writeError(c, fiber.StatusForbidden, "forbidden", "Admin role is required.")
	}
	return c.Next()
}
