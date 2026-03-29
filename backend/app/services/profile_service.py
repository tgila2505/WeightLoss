from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileService:
    def create_profile(
        self,
        session: Session,
        user: User,
        payload: ProfileCreate,
    ) -> Profile:
        existing_profile = session.scalar(
            select(Profile).where(Profile.user_id == user.id)
        )
        if existing_profile is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Profile already exists",
            )

        profile = Profile(user_id=user.id, **payload.model_dump())
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile

    def get_profile(self, session: Session, user: User) -> Profile:
        profile = session.scalar(select(Profile).where(Profile.user_id == user.id))
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found",
            )
        return profile

    def update_profile(
        self,
        session: Session,
        user: User,
        payload: ProfileUpdate,
    ) -> Profile:
        profile = self.get_profile(session, user)
        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(profile, field_name, value)

        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile

    def delete_profile(self, session: Session, user: User) -> None:
        profile = self.get_profile(session, user)
        session.delete(profile)
        session.commit()
