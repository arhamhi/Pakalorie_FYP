from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Food(Base):
    __tablename__ = "foods"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_foods_source_source_id"),
        UniqueConstraint("slug", name="uq_foods_slug"),
    )

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(80), nullable=False)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ur: Mapped[str | None] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(120), index=True)
    base_unit: Mapped[str] = mapped_column(String(64), nullable=False, default="grams")
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    aliases: Mapped[list["FoodAlias"]] = relationship(
        back_populates="food", cascade="all, delete-orphan"
    )
    portions: Mapped[list["PortionSize"]] = relationship(
        back_populates="food", cascade="all, delete-orphan"
    )
    modifiers: Mapped[list["ModifierConstant"]] = relationship(
        back_populates="food", cascade="all, delete-orphan"
    )


class FoodAlias(Base):
    __tablename__ = "food_aliases"
    __table_args__ = (UniqueConstraint("food_id", "alias", "language", name="uq_food_alias"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    food_id: Mapped[str] = mapped_column(ForeignKey("foods.id", ondelete="CASCADE"), index=True)
    alias: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False, default="en")

    food: Mapped[Food] = relationship(back_populates="aliases")


class PortionSize(Base):
    __tablename__ = "portion_sizes"
    __table_args__ = (UniqueConstraint("food_id", "label", name="uq_portion_food_label"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    food_id: Mapped[str] = mapped_column(ForeignKey("foods.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    weight_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    source_portion_id: Mapped[str | None] = mapped_column(String(80))
    is_default: Mapped[bool] = mapped_column(nullable=False, default=False)

    food: Mapped[Food] = relationship(back_populates="portions")
    nutrition: Mapped["NutritionFact"] = relationship(
        back_populates="portion", cascade="all, delete-orphan", uselist=False
    )


class NutritionFact(Base):
    __tablename__ = "nutrition_facts"
    __table_args__ = (UniqueConstraint("portion_id", name="uq_nutrition_portion"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    food_id: Mapped[str] = mapped_column(ForeignKey("foods.id", ondelete="CASCADE"), index=True)
    portion_id: Mapped[int] = mapped_column(
        ForeignKey("portion_sizes.id", ondelete="CASCADE"), index=True
    )
    calories_kcal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    protein_g: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    carbs_g: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    fat_g: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    fiber_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    portion_weight_g: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    portion: Mapped[PortionSize] = relationship(back_populates="nutrition")


class ModifierConstant(Base):
    __tablename__ = "modifier_constants"
    __table_args__ = (UniqueConstraint("food_id", "name", name="uq_modifier_food_name"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    food_id: Mapped[str] = mapped_column(ForeignKey("foods.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kcal_delta: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    food: Mapped[Food] = relationship(back_populates="modifiers")
