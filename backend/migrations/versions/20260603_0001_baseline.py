"""baseline food database schema

Revision ID: 20260603_0001
Revises:
Create Date: 2026-06-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260603_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "foods",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("source_id", sa.String(length=80), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column("name_ur", sa.String(length=255), nullable=True),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("base_unit", sa.String(length=64), nullable=False, server_default="grams"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_foods_slug"),
        sa.UniqueConstraint("source", "source_id", name="uq_foods_source_source_id"),
    )
    op.create_index(op.f("ix_foods_category"), "foods", ["category"], unique=False)
    op.create_index(op.f("ix_foods_source"), "foods", ["source"], unique=False)
    op.create_index(
        "ix_foods_name_en_trgm",
        "foods",
        ["name_en"],
        unique=False,
        postgresql_using="gin",
        postgresql_ops={"name_en": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_foods_name_ur_trgm",
        "foods",
        ["name_ur"],
        unique=False,
        postgresql_using="gin",
        postgresql_ops={"name_ur": "gin_trgm_ops"},
    )

    op.create_table(
        "food_aliases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("food_id", sa.String(length=80), nullable=False),
        sa.Column("alias", sa.String(length=255), nullable=False),
        sa.Column("language", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["food_id"], ["foods.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("food_id", "alias", "language", name="uq_food_alias"),
    )
    op.create_index(op.f("ix_food_aliases_food_id"), "food_aliases", ["food_id"], unique=False)
    op.create_index(
        "ix_food_aliases_alias_trgm",
        "food_aliases",
        ["alias"],
        unique=False,
        postgresql_using="gin",
        postgresql_ops={"alias": "gin_trgm_ops"},
    )

    op.create_table(
        "portion_sizes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("food_id", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("weight_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("source_portion_id", sa.String(length=80), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["food_id"], ["foods.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("food_id", "label", name="uq_portion_food_label"),
    )
    op.create_index(op.f("ix_portion_sizes_food_id"), "portion_sizes", ["food_id"], unique=False)

    op.create_table(
        "nutrition_facts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("food_id", sa.String(length=80), nullable=False),
        sa.Column("portion_id", sa.Integer(), nullable=False),
        sa.Column("calories_kcal", sa.Numeric(10, 2), nullable=False),
        sa.Column("protein_g", sa.Numeric(10, 2), nullable=False),
        sa.Column("carbs_g", sa.Numeric(10, 2), nullable=False),
        sa.Column("fat_g", sa.Numeric(10, 2), nullable=False),
        sa.Column("fiber_g", sa.Numeric(10, 2), nullable=True),
        sa.Column("portion_weight_g", sa.Numeric(10, 2), nullable=True),
        sa.ForeignKeyConstraint(["food_id"], ["foods.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["portion_id"], ["portion_sizes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("portion_id", name="uq_nutrition_portion"),
    )
    op.create_index(
        op.f("ix_nutrition_facts_food_id"), "nutrition_facts", ["food_id"], unique=False
    )
    op.create_index(
        op.f("ix_nutrition_facts_portion_id"), "nutrition_facts", ["portion_id"], unique=False
    )

    op.create_table(
        "modifier_constants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("food_id", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kcal_delta", sa.Numeric(10, 2), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["food_id"], ["foods.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("food_id", "name", name="uq_modifier_food_name"),
    )
    op.create_index(
        op.f("ix_modifier_constants_food_id"), "modifier_constants", ["food_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_modifier_constants_food_id"), table_name="modifier_constants")
    op.drop_table("modifier_constants")
    op.drop_index(op.f("ix_nutrition_facts_portion_id"), table_name="nutrition_facts")
    op.drop_index(op.f("ix_nutrition_facts_food_id"), table_name="nutrition_facts")
    op.drop_table("nutrition_facts")
    op.drop_index(op.f("ix_portion_sizes_food_id"), table_name="portion_sizes")
    op.drop_table("portion_sizes")
    op.drop_index("ix_food_aliases_alias_trgm", table_name="food_aliases", postgresql_using="gin")
    op.drop_index(op.f("ix_food_aliases_food_id"), table_name="food_aliases")
    op.drop_table("food_aliases")
    op.drop_index("ix_foods_name_ur_trgm", table_name="foods", postgresql_using="gin")
    op.drop_index("ix_foods_name_en_trgm", table_name="foods", postgresql_using="gin")
    op.drop_index(op.f("ix_foods_source"), table_name="foods")
    op.drop_index(op.f("ix_foods_category"), table_name="foods")
    op.drop_table("foods")
    op.execute("DROP EXTENSION IF EXISTS vector")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
