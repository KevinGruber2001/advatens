package db

import "embed"

// Migrations holds the SQL migration files, embedded so the binary can run
// them from any working directory.
//
//go:embed migrations/*.sql
var Migrations embed.FS
