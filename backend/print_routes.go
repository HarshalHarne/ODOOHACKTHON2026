package main

import (
	"fmt"
	"github.com/gofiber/fiber/v3"
	"github.com/HarshalHarne/assetflow/internal/api"
)

func main() {
	app := fiber.New()
	api.RegisterRoutes(app, api.RouterDeps{
		AuthHandler:       &api.AuthHandler{},
		DepartmentHandler: &api.DepartmentHandler{},
		EmployeeHandler:   &api.EmployeeHandler{},
		CategoryHandler:   &api.CategoryHandler{},
		JWTSecret:         "secret",
	})
	
	data := app.Stack()
	for _, route := range data {
		for _, r := range route {
			fmt.Printf("%s %s\n", r.Method, r.Path)
		}
	}
}
