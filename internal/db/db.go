// Package db owns the sqlx connection and all raw SQL. One file per table.
package db

import (
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

// DB is the shared connection pool, set by Open.
var DB *sqlx.DB

func Open(dsn string) error {
	d, err := sqlx.Connect("mysql", dsn)
	if err != nil {
		return err
	}
	DB = d
	return nil
}
