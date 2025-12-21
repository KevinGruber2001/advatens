package migrate

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	migrate "github.com/rubenv/sql-migrate"
	"log"
)

func Migrate(db *pgxpool.Pool) error {
	migrations := migrate.FileMigrationSource{
		Dir: "internal/db/migrations",
	}
	sqlDB := stdlib.OpenDB(*db.Config().ConnConfig)
	n, err := migrate.Exec(sqlDB, "postgres", migrations, migrate.Up)
	if err != nil {
		return err
	}
	log.Print("Applied %d migrations!\n", n)
	return nil
}
