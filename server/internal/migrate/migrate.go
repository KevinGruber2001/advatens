package migrate

import (
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	migrate "github.com/rubenv/sql-migrate"

	"server/internal/db"
)

func Migrate(pool *pgxpool.Pool) error {
	migrations := migrate.EmbedFileSystemMigrationSource{
		FileSystem: db.Migrations,
		Root:       "migrations",
	}
	sqlDB := stdlib.OpenDB(*pool.Config().ConnConfig)
	defer sqlDB.Close()
	n, err := migrate.Exec(sqlDB, "postgres", migrations, migrate.Up)
	if err != nil {
		return err
	}
	log.Printf("Applied %d migrations!", n)
	return nil
}
