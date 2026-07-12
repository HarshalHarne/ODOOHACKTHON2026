package core

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/HarshalHarne/assetflow/internal/db"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInactiveEmployee   = errors.New("employee account is inactive")
)

type AuthServicer interface {
	Login(ctx context.Context, email, password string) (LoginResult, error)
}

type AuthQuerier interface {
	GetEmployeeByEmail(ctx context.Context, email string) (db.Employee, error)
}

type AuthService struct {
	store     AuthQuerier
	jwtSecret []byte
	jwtExpiry time.Duration
}

type LoginResult struct {
	AccessToken string    `json:"access_token"`
	ExpiresAt   time.Time `json:"expires_at"`
	Employee    Employee  `json:"employee"`
}

type authClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthService(store AuthQuerier, jwtSecret string, jwtExpiry time.Duration) *AuthService {
	return &AuthService{
		store:     store,
		jwtSecret: []byte(jwtSecret),
		jwtExpiry: jwtExpiry,
	}
}

func (s *AuthService) Login(ctx context.Context, email, password string) (LoginResult, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	password = strings.TrimSpace(password)

	if email == "" || password == "" {
		return LoginResult{}, ErrInvalidCredentials
	}

	employee, err := s.store.GetEmployeeByEmail(ctx, email)
	if err != nil {
		if isNoRows(err) {
			return LoginResult{}, ErrInvalidCredentials
		}
		return LoginResult{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(employee.PasswordHash), []byte(password)); err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	if employee.Status != db.EmployeeStatusActive {
		return LoginResult{}, ErrInactiveEmployee
	}

	expiresAt := time.Now().UTC().Add(s.jwtExpiry)
	claims := authClaims{
		Role: string(employee.Role),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   uuidToString(employee.ID),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return LoginResult{}, err
	}

	return LoginResult{
		AccessToken: signedToken,
		ExpiresAt:   expiresAt,
		Employee:    employeeToCore(employee),
	}, nil
}
