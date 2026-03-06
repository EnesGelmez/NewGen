package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/nexus/backend/internal/domain"
)

// UserRepo is the PostgreSQL implementation of domain.UserRepository.
type UserRepo struct{ db *DB }

func NewUserRepo(db *DB) *UserRepo { return &UserRepo{db: db} }

const userCols = `id, tenant_id, name, email, password_hash, role, is_active, must_change_password, created_at, updated_at`

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	var tenantID *string // nullable
	err := row.Scan(&u.ID, &tenantID, &u.Name, &u.Email,
		&u.PasswordHash, &u.Role, &u.IsActive, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if tenantID != nil {
		u.TenantID = *tenantID
	}
	return &u, nil
}

func (r *UserRepo) FindAll(ctx context.Context, tenantID string) ([]domain.User, error) {
	rows, err := r.db.Pool.Query(ctx,
		`SELECT `+userCols+` FROM users WHERE tenant_id=$1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("users FindAll: %w", err)
	}
	defer rows.Close()
	var out []domain.User
	for rows.Next() {
		var u domain.User
		var tid *string
		if err := rows.Scan(&u.ID, &tid, &u.Name, &u.Email,
			&u.PasswordHash, &u.Role, &u.IsActive, &u.MustChangePassword, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		if tid != nil {
			u.TenantID = *tid
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *UserRepo) FindByID(ctx context.Context, id string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE id=$1`, id)
	u, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("user %q not found", id)
	}
	return u, err
}

func (r *UserRepo) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT `+userCols+` FROM users WHERE email=$1`, email)
	u, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("user %q not found", email)
	}
	return u, err
}

func (r *UserRepo) Create(ctx context.Context, u *domain.User) error {
	now := time.Now().UTC()
	u.CreatedAt = now
	u.UpdatedAt = now
	var tid *string
	if u.TenantID != "" {
		tid = &u.TenantID
	}
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_active, must_change_password, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		u.ID, tid, u.Name, u.Email, u.PasswordHash, u.Role, u.IsActive, u.MustChangePassword, u.CreatedAt, u.UpdatedAt)
	return err
}

func (r *UserRepo) Update(ctx context.Context, u *domain.User) error {
	u.UpdatedAt = time.Now().UTC()
	var tid *string
	if u.TenantID != "" {
		tid = &u.TenantID
	}
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE users SET tenant_id=$2, name=$3, email=$4, password_hash=$5,
		role=$6, is_active=$7, must_change_password=$8, updated_at=$9 WHERE id=$1`,
		u.ID, tid, u.Name, u.Email, u.PasswordHash, u.Role, u.IsActive, u.MustChangePassword, u.UpdatedAt)
	return err
}

func (r *UserRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM users WHERE id=$1`, id)
	return err
}
