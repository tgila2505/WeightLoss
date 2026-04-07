import hashlib
import hmac
import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.seo import (
    BlogPostResponse,
    BlogSlugListResponse,
    SeoPageListResponse,
    SeoPageResponse,
    UgcPageResponse,
    UgcPreviewResponse,
    UgcShareRequest,
    UgcShareResponse,
    UgcSlugListResponse,
)
from app.services import seo_service

router = APIRouter(prefix="/seo")


@router.get("/pages", response_model=SeoPageListResponse)
def list_seo_pages(session: Session = Depends(get_db_session)) -> SeoPageListResponse:
    slugs = seo_service.list_seo_slugs(session)
    return SeoPageListResponse(slugs=slugs, total=len(slugs))


@router.get("/pages/{slug}", response_model=SeoPageResponse)
def get_seo_page(slug: str, session: Session = Depends(get_db_session)) -> SeoPageResponse:
    page = seo_service.get_seo_page(session, slug)
    if not page:
        raise HTTPException(status_code=404, detail="SEO page not found")
    return SeoPageResponse.model_validate(page)


@router.get("/blog/slugs", response_model=BlogSlugListResponse)
def list_blog_slugs(session: Session = Depends(get_db_session)) -> BlogSlugListResponse:
    slugs = seo_service.list_blog_slugs(session)
    return BlogSlugListResponse(slugs=slugs)


@router.get("/blog/posts", response_model=list[BlogPostResponse])
def list_blog_posts(session: Session = Depends(get_db_session)) -> list[BlogPostResponse]:
    posts = seo_service.list_blog_posts(session)
    return [BlogPostResponse.model_validate(p) for p in posts]


@router.get("/blog/posts/{slug}", response_model=BlogPostResponse)
def get_blog_post(slug: str, session: Session = Depends(get_db_session)) -> BlogPostResponse:
    post = seo_service.get_blog_post(session, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return BlogPostResponse.model_validate(post)


@router.get("/ugc/slugs", response_model=UgcSlugListResponse)
def list_ugc_slugs(session: Session = Depends(get_db_session)) -> UgcSlugListResponse:
    slugs = seo_service.list_ugc_slugs(session)
    return UgcSlugListResponse(slugs=slugs)


@router.post("/ugc/share", response_model=UgcShareResponse, status_code=status.HTTP_201_CREATED)
def share_ugc_page(
    payload: UgcShareRequest,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> UgcShareResponse:
    profile = seo_service.get_user_profile_for_ugc(session, current_user.id)
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found — complete onboarding first")

    page = seo_service.share_ugc_page(
        session=session,
        user_id=current_user.id,
        display_name=profile.name,
        user_quote=payload.user_quote,
        display_name_visible=payload.display_name_visible,
        kg_lost=profile.kg_lost,
        weeks_taken=profile.weeks_taken,
        diet_type=profile.diet_type,
    )
    base_url = seo_service.get_base_url()
    return UgcShareResponse(slug=page.slug, url=f"{base_url}/results/{page.slug}", is_public=page.is_public)


@router.delete("/ugc/unshare", status_code=status.HTTP_204_NO_CONTENT)
def unshare_ugc_page(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    removed = seo_service.unshare_ugc_page(session, current_user.id)
    if not removed:
        raise HTTPException(status_code=404, detail="No public result page found")


@router.get("/ugc/preview", response_model=UgcPreviewResponse)
def preview_ugc_page(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> UgcPreviewResponse:
    profile = seo_service.get_user_profile_for_ugc(session, current_user.id)
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found")

    preview = seo_service.get_ugc_preview(
        session=session,
        user_id=current_user.id,
        display_name=profile.name,
        kg_lost=profile.kg_lost,
        weeks_taken=profile.weeks_taken,
        diet_type=profile.diet_type,
    )
    return UgcPreviewResponse(**preview)


@router.get("/ugc/{slug}", response_model=UgcPageResponse)
def get_ugc_page(slug: str, session: Session = Depends(get_db_session)) -> UgcPageResponse:
    page = seo_service.get_ugc_page(session, slug)
    if not page:
        raise HTTPException(status_code=404, detail="Result page not found")
    return UgcPageResponse.model_validate(page)


@router.post("/revalidate", status_code=status.HTTP_204_NO_CONTENT)
def revalidate_seo_cache(
    x_cron_secret: str | None = Header(default=None, alias="x-cron-secret"),
    session: Session = Depends(get_db_session),
) -> None:
    """Weekly cron endpoint — triggers Next.js on-demand revalidation for SEO pages.

    Called by a Vercel cron job (vercel.json schedule). Protected by CRON_SECRET header.
    The actual Next.js revalidation is fire-and-forget via the frontend revalidation API.
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected:
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")

    # Constant-time comparison to prevent timing attacks
    provided = x_cron_secret or ""
    if not hmac.compare_digest(
        hashlib.sha256(provided.encode()).digest(),
        hashlib.sha256(expected.encode()).digest(),
    ):
        raise HTTPException(status_code=401, detail="Unauthorised")

    # Enqueue revalidation tags via the frontend API (fire-and-forget)
    import threading

    def _revalidate() -> None:
        import urllib.request
        frontend_url = os.environ.get("NEXT_PUBLIC_BASE_URL", "http://localhost:3000")
        revalidate_secret = os.environ.get("REVALIDATE_SECRET", "")
        try:
            req = urllib.request.Request(
                f"{frontend_url}/api/revalidate",
                data=b"{}",
                headers={
                    "Content-Type": "application/json",
                    "x-revalidate-secret": revalidate_secret,
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception:
            pass  # Non-critical — sitemap/ISR will catch up on next TTL expiry

    threading.Thread(target=_revalidate, daemon=True).start()
