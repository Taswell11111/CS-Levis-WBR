"""
Levi's — ReturnGO Ops Dashboard
================================


Architecture:
  BASE  → ReturnGO API (RMAs, tracking, comments, resolution) via returngo_core
  ADD-ON → Parcelninja (inbound cross-ref for clientId + courier tracking scrape) via returngo_core

Store: Levi's (levis-sa.myshopify.com)
Dashboard Features:
  • RMA Command Centre: View, filter, update pending/approved RMAs
"""

import streamlit as st
import streamlit.components.v1 as components
import requests
import json
import pandas as pd
import time
import re
import logging
import html as html_lib
import base64
import random
import warnings
from pathlib import Path, PurePath
from datetime import datetime, timedelta, timezone, date
from packaging import version
from typing import Optional, Tuple, Dict, Set, Union, Any, Mapping, List, Literal
import concurrent.futures
import altair as alt
from urllib.parse import parse_qs, unquote, urlparse

from returngo_core import (
    DISPLAY_TZ, DISPLAY_TZ_NAME, ACTIVE_RG_STATUSES, COURIER_STATUS_OPTIONS, RG_RPS, RATE_LIMIT_INFO,
    UserSettings, PerformanceMetrics,
    safe_get, safe_parse_date_iso, format_date, compute_days_since, get_event_date,
    get_received_date, get_credit_date, get_resolution_types, has_tracking_update_comment,
    get_tracking_number_with_indicator, get_last_rma_update, is_resolution_actioned,
    extract_order_name, extract_customer_name, check_for_flagged_comment,
    api_url, returngo_limiter, update_rate_limit_info, get_requests_session, get_pn_session,
    get_rma_by_id as core_get_rma_by_id, post_rma_comment as core_post_rma_comment, push_tracking_update as core_push_tracking_update,
    scrape_parcel_ninja_status, get_shipment_status,
    _load_file, _save_file, update_perf_metric,
    _fetch_pn_inbound_events, _parse_pn_ts, _fmt_pn_ts
)

from tracking_update_feature import (
    format_tracking_update_log_entry,
    show_update_tracking_reference_dialog,
    update_tracking_via_api,
    validate_tracking_reference,
)


# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)
logging.getLogger("watchdog.observers.inotify_buffer").setLevel(logging.WARNING)


class _NoScriptCtxFilter(logging.Filter):
    def filter(self, record):
        return "missing ScriptRunContext" not in record.getMessage()


# Suppress the specific pandas FutureWarning from pd.concat
warnings.filterwarnings(
    "ignore",
    message="The behavior of DataFrame concatenation with empty or all-NA entries is deprecated.*",
    category=FutureWarning,
)

logging.getLogger("streamlit.runtime.scriptrunner_utils.script_run_context").addFilter(_NoScriptCtxFilter())


# ─────────────────────────────────────────────
# ① STORE & API CONFIGURATION
# ─────────────────────────────────────────────
# Load API secrets from Streamlit secrets
MY_API_KEY = (
    st.secrets.get("Levis_RETURNGO_API_KEY")
    or st.secrets.get("RETURNGO_API_KEY")
)

if MY_API_KEY is None:
    st.error("Application error: Missing 'Levis_RETURNGO_API_KEY' or 'RETURNGO_API_KEY' in Streamlit secrets.")
    st.write("Available secrets:", list(st.secrets.keys()))
    st.stop()

STORE_URL = "levis-sa.myshopify.com"
TRACKING_UPDATE_STORES = [
    {"name": "Levi's", "url": STORE_URL},
    {"name": "Diesel", "url": "diesel-dev-south-africa.myshopify.com"},
    {"name": "Hurley", "url": "hurley-dev-south-africa.myshopify.com"},
    {"name": "Jeep Apparel", "url": "jeep-apparel-dev-south-africa.myshopify.com"},
    {"name": "Reebok", "url": "reebok-dev-south-africa.myshopify.com"},
    {"name": "Superdry", "url": "superdry-dev-south-africa.myshopify.com"},
]
BASE_URL = "https://api.returngo.ai"
PARCELNINJA_USERNAME = "4lQbm0CgLBZQkzIiPnwWnjCQqgEdXsP6mVQ6q7nX24Y="
PARCELNINJA_PASSWORD = "70JK3u4z/IxrGdpdSUE4csPfzlg/wgGTcuAgUgbd+j4="

PN_BASE = "https://storeapi.parcelninja.com/api/v1"


# ─────────────────────────────────────────────
# ③ EFFICIENCY CONTROLS
# ─────────────────────────────────────────────
CACHE_EXPIRY_HOURS = 24
COURIER_REFRESH_HOURS = 6
MAX_WORKERS = 3
PN_MAX_EVENT_WORKERS = 8
PN_MAX_EVENT_FANOUT = 500
PN_DEFAULT_TIMEOUT = 20
SYNC_OVERLAP_MINUTES = 35

# ─────────────────────────────────────────────
# ④ RUNTIME STATE & PERSISTENCE
# ─────────────────────────────────────────────
df_view = pd.DataFrame()
counts: Dict[str, int] = {}

USER_SETTINGS_FILE = Path("user_settings.pkl")
PERFORMANCE_FILE = Path("performance_metrics.pkl")

KEYBOARD_SHORTCUTS = {
    "1": "Pending Requests",
    "2": "RG APPROVED > SUBMITTED TO COURIER",
    "3": "Approved - In Transit",
    "4": "Received",
    "5": "No Tracking",
    "6": "Flagged",
    "7": "Courier Cancelled",
    "8": "Approved - Delivered",
    "9": "Resolution Actioned",
    "0": "No Resolution Actioned",
    "s": "search",
    "f": "toggle_favorites",
    "r": "refresh_all",
    "e": "export_csv",
    "c": "clear_filters",
}

def load_user_settings() -> UserSettings:
    """Load user settings from file or create default."""
    return _load_file(USER_SETTINGS_FILE, UserSettings)

def save_user_settings(settings: UserSettings):
    """Save user settings to file."""
    _save_file(USER_SETTINGS_FILE, settings)

def format_recent_sync_detail() -> str:
    """Builds a user-facing summary of recent sync/update activity."""
    recent_fetch = st.session_state.get("last_sync_time")
    recent_rma_update = st.session_state.get("last_rma_update_time")
    session_access_time = st.session_state.get("session_access_time")

    if recent_fetch is None:
        recent_fetch = session_access_time
    if recent_rma_update is None:
        recent_rma_update = session_access_time

    fetch_str = format_date(recent_fetch, "%Y-%m-%d %H:%M:%S") if recent_fetch else "Never"
    rma_update_str = format_date(recent_rma_update, "%Y-%m-%d %H:%M:%S") if recent_rma_update else "Never"
    return f"Recent Sync: Fetch {fetch_str} | RMA Update {rma_update_str}"


def get_received_date_from_events_or_comments(rma_data: dict) -> Optional[datetime]:
    """
    Gets the shipment received date, prioritizing the 'SHIPMENT_RECEIVED' event,
    but falling back to the earliest system comment containing 'RECEIVED'.
    """
    # 1. Prioritize the official event
    event_date = get_event_date(rma_data, "SHIPMENT_RECEIVED")
    return event_date if event_date else get_received_date(rma_data)

def get_done_date_from_comments(rma_data: dict) -> Optional[datetime]:
    """
    Finds the timestamp when the RMA status was updated to 'Done' from comments.
    """
    comments = safe_get(rma_data, "comments", [])
    if not comments:
        return None

    done_comment_dates = []
    # The pattern is usually "status was updated to <strong>Done</strong>"
    # A case-insensitive search for "status was updated to" and "done" is robust.
    for comment in comments:
        html_text = comment.get("htmlText", "").lower()
        if "status was updated to" in html_text and "done" in html_text:
            comment_date = safe_parse_date_iso(comment.get("datetime"))
            if comment_date:
                done_comment_dates.append(comment_date)

    # Return the most recent 'Done' comment date
    return max(done_comment_dates) if done_comment_dates else None


def _build_parcelninja_auth_header() -> str:
    """Build ParcelNinja Basic auth header from a single shared credential source."""
    auth_str = f"{PARCELNINJA_USERNAME}:{PARCELNINJA_PASSWORD}"
    encoded_auth_str = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")
    return f"Basic {encoded_auth_str}"

def _parse_timeline_event_date(status_string: str) -> Optional[datetime]:
    """Parses a datetime from a courier status string like 'Day, DD Mon HH:MM | Status'."""
    if not isinstance(status_string, str) or '|' not in status_string:
        return None
    
    date_part = status_string.split('|')[0].strip()
    # The year is missing from the string, so we add the current year.
    # This is a reasonable assumption for an operational dashboard viewing recent events.
    date_string_with_year = f"{date_part} {datetime.now().year}"
    
    try:
        # Format: 'Tue, 14 May 13:30 2024' -> '%a, %d %b %H:%M %Y'
        return datetime.strptime(date_string_with_year, '%a, %d %b %H:%M %Y')
    except ValueError:
        logger.warning(f"Could not parse date from courier status: {status_string}")
        return None
# ─────────────────────────────────────────────
# ⑤.A ENHANCED FEATURE FUNCTIONS
# ─────────────────────────────────────────────

def has_tracking_number_update(rma_data: dict) -> bool:
    """
    Checks if there's any comment indicating a tracking number update.
    Common patterns: 'tracking number updated', 'new tracking', 'updated to'
    """
    comments = safe_get(rma_data, "comments", [])
    if not comments:
        return False
    
    for comment in comments:
        html_text = comment.get("htmlText", "").lower()
        # Look for patterns indicating tracking update
        patterns = [
            "tracking number was updated",
            "new tracking number",
            "updated tracking",
            "tracking updated to",
            "changed tracking",
            "updated waybill"
        ]
        
        if any(pattern in html_text for pattern in patterns):
            return True
    
    return False


# ─────────────────────────────────────────────
# ⑦ RETURNGO API CALLS
# ─────────────────────────────────────────────
def fetch_returngo_rmas(
    api_key: str,
    store_url: str,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    updated_since: Optional[str] = None,
    max_pages: int = 99999,
    pagesize: int = 100,
) -> List[dict]:
    """
    Fetches RMA pages from ReturnGO API using the correct endpoint structure.
    """
    all_rmas = []
    session = get_requests_session()
    page = 1
    cursor = None

    while page <= max_pages:
        returngo_limiter.wait_if_needed()
        
        # Build params according to API spec
        params = {
            "pagesize": str(pagesize)
        }
        
        if cursor:
            params["cursor"] = cursor
        
        if status:
            params["status"] = status
        
        created_at_filters = []
        if start_date:
            created_at_filters.append(f"gte:{start_date}")
        if end_date:
            created_at_filters.append(f"lte:{end_date}")
        if created_at_filters:
            params["rma_created_at"] = ",".join(created_at_filters)

        if updated_since:
            params["rma_updated_at"] = f"gte:{updated_since}"

        try:
            start_time = time.time()
            resp = session.get(
                "https://api.returngo.ai/rmas",
                headers={
                    "x-api-key": api_key,
                    "x-shop-name": store_url,
                    "Content-Type": "application/json",
                },
                params=params,
                timeout=60,
            )
            api_time = time.time() - start_time
            update_perf_metric(PERFORMANCE_FILE, api_time)
            
            update_rate_limit_info(resp.headers)

            if resp.status_code == 429:
                logger.warning(f"Rate limit hit on page {page}. Sleeping 60s.")
                __import__("returngo_core").RATE_LIMIT_HIT.set()
                time.sleep(60)
                __import__("returngo_core").RATE_LIMIT_HIT.clear()
                continue

            resp.raise_for_status()
            data = resp.json()
            rmas = data.get("rmas", [])
            
            if not rmas:
                logger.info(f"No more RMAs on page {page}. Ending fetch.")
                break

            all_rmas.extend(rmas)
            logger.info(f"Page {page}: fetched {len(rmas)} RMAs (total so far: {len(all_rmas)})")
            
            # Check for cursor to continue pagination
            cursor = data.get("next_cursor")
            if not cursor:
                break
                
            page += 1

        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error on page {page}: {http_err}", exc_info=True)
            break
        except Exception as e:
            logger.error(f"Error fetching page {page}: {e}", exc_info=True)
            break

    logger.info(f"Fetch completed. Total RMAs retrieved: {len(all_rmas)}")
    return all_rmas


def get_rma_by_id(api_key: str, store_url: str, rma_id: str) -> Optional[dict]:
    headers = {"x-api-key": api_key, "x-shop-name": store_url, "Content-Type": "application/json"}
    return core_get_rma_by_id(get_requests_session(), headers, rma_id, PERFORMANCE_FILE)


def post_rma_comment(api_key: str, store_url: str, rma_id: str, comment_text: str) -> bool:
    headers = {"x-api-key": api_key, "x-shop-name": store_url, "Content-Type": "application/json"}
    return core_post_rma_comment(get_requests_session(), headers, rma_id, comment_text, PERFORMANCE_FILE)




def get_headers(api_key: str, store_url: str) -> Dict[str, str]:
    return {
        "x-api-key": api_key,
        "X-API-KEY": api_key,
        "x-shop-name": store_url,
        "Content-Type": "application/json",
    }


def validate_api_key(api_key: str, store_url: str) -> Tuple[bool, Union[int, str]]:
    try:
        res = requests.get(
            f"{BASE_URL}/rmas",
            headers=get_headers(api_key, store_url),
            params={"pagesize": 1},
            timeout=10,
        )
        return res.status_code == 200, res.status_code
    except Exception as e:
        return False, str(e)

def _normalize_parcel_ninja_tracking_url(tracking_number: Optional[str], tracking_url: Optional[str] = None) -> str:
    """Normalize Parcel Ninja tracking URL formats while preserving backward compatibility."""
    clean_tracking = (tracking_number or "").replace(" ↻", "").strip()
    base_url = "https://optimise.parcelninja.com/shipment/track"

    if tracking_url and isinstance(tracking_url, str):
        parsed = urlparse(tracking_url.strip())
        host = (parsed.netloc or "").lower()
        path = (parsed.path or "").rstrip("/")

        if host == "optimise.parcelninja.com" and path == "/shipment/track":
            waybill = parse_qs(parsed.query).get("WaybillNo", [""])[0].strip()
            if waybill:
                return f"{base_url}?WaybillNo={unquote(waybill)}"
            if clean_tracking:
                return f"{base_url}?WaybillNo={clean_tracking}"

        if host == "optimise.parcelninja.com" and path.startswith("/shipment/track/"):
            waybill_from_path = path.split("/shipment/track/", 1)[1].strip("/")
            if waybill_from_path:
                return f"{base_url}?WaybillNo={unquote(waybill_from_path)}"

    return f"{base_url}?WaybillNo={clean_tracking}"


def is_valid_parcel_ninja_tracking_url(tracking_url: str) -> bool:
    """Strict validation for Parcel Ninja tracking URL override host/path."""
    if not tracking_url or not isinstance(tracking_url, str):
        return False

    parsed = urlparse(tracking_url.strip())
    host = (parsed.netloc or "").lower()
    path = (parsed.path or "").rstrip("/")

    if parsed.scheme != "https" or host != "optimise.parcelninja.com":
        return False

    if path == "/shipment/track":
        query = parse_qs(parsed.query)
        return bool((query.get("WaybillNo", [""])[0] or "").strip())

    if path.startswith("/shipment/track/"):
        return bool(path.split("/shipment/track/", 1)[1].strip("/"))

    return False


def push_tracking_update(
    rma_id: str,
    shipment_id: str,
    tracking_number: str,
    store_url: str,
    api_key: Optional[str] = None,
    tracking_url: Optional[str] = None,
) -> Tuple[bool, str]:
    """Update tracking number for a shipment using the direct ReturnGO shipment API."""
    effective_api_key = api_key or MY_API_KEY
    if not effective_api_key:
        return False, "API key is not configured for ReturnGO updates."

    payload = {
        "status": "LabelCreated",
        "carrierName": "CourierGuy",
        "trackingNumber": tracking_number,
        "trackingURL": tracking_url or _normalize_parcel_ninja_tracking_url(tracking_number),
        "labelURL": "https://sellerportal.dpworld.com/api/file-download?link=null",
    }

    response = requests.put(
        f"{BASE_URL}/shipment/{shipment_id}",
        headers=get_headers(effective_api_key, store_url),
        json=payload,
        timeout=15,
    )
    if response.status_code not in (200, 201):
        return False, f"HTTP {response.status_code}: {response.text[:200]}"
    return True, "Tracking updated successfully"


def run_update_sequence(
    rma_id: str,
    new_tracking_number: str,
    store_url: str = STORE_URL,
    api_key: Optional[str] = None,
):
    try:
        effective_api_key = api_key or MY_API_KEY
        if not effective_api_key:
            raise Exception("API key is not configured for ReturnGO updates.")

        # --- STEP 1: FETCH ---
        append_ops_log(f"Starting update for RMA {rma_id}...")
        append_ops_log(f"API Call: GET /rma/{rma_id}")

        res = requests.get(
            f"{BASE_URL}/rma/{rma_id}",
            headers=get_headers(effective_api_key, store_url),
            timeout=15,
        )
        if res.status_code != 200:
            raise Exception(f"Fetch failed: HTTP {res.status_code}")

        rma_data = res.json()
        shipments = rma_data.get("shipments", [])
        if not shipments:
            raise Exception("No shipments found on this RMA.")

        shipment = shipments[0]
        shipment_id = shipment.get("shipmentId")
        if not shipment_id:
            raise Exception("Shipment found, but it has no shipmentId.")

        old_tracking = shipment.get("trackingNumber", "N/A")

        append_ops_log(f"Shipment identified: {shipment_id}")
        append_ops_log(f"Current tracking: {old_tracking}")

        # --- STEP 2: UPDATE ---
        append_ops_log(f"API Call: PUT /shipment/{shipment_id}")
        success, message = push_tracking_update(
            rma_id,
            shipment_id,
            new_tracking_number,
            store_url,
            api_key=effective_api_key,
        )
        if not success:
            raise Exception(f"Update failed: {message}")

        append_ops_log(f"Tracking updated successfully to {new_tracking_number}")

        # --- STEP 3: COMMENT ---
        append_ops_log(f"API Call: POST /rma/{rma_id}/comment")
        ts_comment = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        comment_html = f"<b>Tracking Updated — {ts_comment}</b><br>Prev: {old_tracking}<br>New: {new_tracking_number}<br>Carrier: CourierGuy"

        comm_res = requests.post(
            f"{BASE_URL}/rma/{rma_id}/comment",
            headers=get_headers(effective_api_key, store_url),
            json={"commentType": "merchant", "htmlText": comment_html},
            timeout=15,
        )

        if comm_res.status_code in (200, 201):
            append_ops_log("Timeline comment added to RMA record")
        else:
            append_ops_log("Warning: Could not post timeline comment.")

        append_ops_log("Job completed successfully.")
        st.success(f"Successfully updated RMA {rma_id}")
        return True

    except Exception as e:
        append_ops_log(f"Error: {e}")
        st.error(f"Failed: {str(e)}")
        return False

@st.cache_data(ttl=1800, show_spinner=False)
def fetch_pn_latest_status_by_client(
    start_date: datetime,
    end_date: datetime,
    prefetched_inbounds: Optional[List[dict]] = None,
) -> Dict[str, Dict[str, str]]:
    """Return latest inbound event status per Parcelninja clientId for a date window."""
    enrichment_start = time.perf_counter()
    with get_pn_session() as pn_session:
        if prefetched_inbounds is not None:
            inbounds = prefetched_inbounds
            logger.info("ParcelNinja inbounds reused from prefetch (%s records)", len(inbounds))
        else:
            inbounds_fetch_start = time.perf_counter()
            inbounds = fetch_parcelninja_inbounds(start_date, end_date, _session=pn_session, timeout=PN_DEFAULT_TIMEOUT)
            logger.info("ParcelNinja inbounds list fetch completed in %.2fs", time.perf_counter() - inbounds_fetch_start)

        if not inbounds:
            logger.info("ParcelNinja enrichment completed in %.2fs", time.perf_counter() - enrichment_start)
            return {}

        latest_inbound_by_client: Dict[str, dict] = {}
        for ib in inbounds:
            client_id = str(ib.get("clientId", "")).strip()
            if not client_id:
                continue

            create_dt = _parse_pn_ts(str(ib.get("createDate", "")))

            current = latest_inbound_by_client.get(client_id)
            current_dt = _parse_pn_ts(str(current.get("createDate", ""))) if current else None

            if create_dt and (current_dt is None or create_dt > current_dt):
                latest_inbound_by_client[client_id] = ib

        client_status_map: Dict[str, Dict[str, str]] = {}
        fanout_items = list(latest_inbound_by_client.items())
        logger.info("ParcelNinja unique client IDs considered for status fanout: %s", len(fanout_items))

        if len(fanout_items) > PN_MAX_EVENT_FANOUT:
            logger.warning(
                "ParcelNinja event fanout queue size %s exceeds threshold %s; truncating queue for safety.",
                len(fanout_items),
                PN_MAX_EVENT_FANOUT,
            )
            fanout_items = fanout_items[:PN_MAX_EVENT_FANOUT]

        logger.info("ParcelNinja event calls issued: %s", len(fanout_items))

        event_fanout_start = time.perf_counter()

        def _fetch_client_status(client_summary: Tuple[str, dict]) -> Optional[Tuple[str, Dict[str, str]]]:
            client_id, summary = client_summary
            inbound_id = summary.get("id")
            if not inbound_id:
                return None

            detail = fetch_inbound_events(inbound_id, _session=pn_session, timeout=PN_DEFAULT_TIMEOUT)
            events = (detail or {}).get("events", [])

            latest_ev: Dict[str, Any] = {}
            if events and isinstance(events, list):
                parsed_events = [
                    (ev, _parse_pn_ts(str(ev.get("timeStamp", ""))))
                    for ev in events
                    if isinstance(ev, dict)
                ]
                valid_events = [(ev, ts) for ev, ts in parsed_events if ts is not None]

                if valid_events:
                    latest_ev = max(valid_events, key=lambda item: item[1])[0]
                else:
                    # Fallback to API list ordering when all event timestamps are missing/invalid.
                    latest_ev = events[0] if isinstance(events[0], dict) else {}

            return client_id, {
                "inbound_status": latest_ev.get("description") or "-",
                "inbound_update_date": _fmt_pn_ts(latest_ev.get("timeStamp")) if latest_ev else "-",
            }

        fanout_workers = min(PN_MAX_EVENT_WORKERS, max(1, len(fanout_items)))
        with concurrent.futures.ThreadPoolExecutor(max_workers=fanout_workers) as executor:
            for result in executor.map(_fetch_client_status, fanout_items):
                if not result:
                    continue
                client_id, status = result
                client_status_map[client_id] = status

        logger.info("ParcelNinja event fetch fanout completed in %.2fs", time.perf_counter() - event_fanout_start)
        logger.info("ParcelNinja enrichment completed in %.2fs", time.perf_counter() - enrichment_start)
        return client_status_map

@st.cache_data(ttl=3600, show_spinner=False)
def fetch_parcelninja_inbounds(
    start_date: datetime,
    end_date: datetime,
    _session: Optional[requests.Session] = None,
    timeout: float = PN_DEFAULT_TIMEOUT,
) -> List[dict]:
    """
    Retrieves inbounds from the ParcelNinja API for a given date range.
    """
    headers = {
        "Accept": "application/json",
        "Authorization": _build_parcelninja_auth_header(),
    }

    params = {
        "startDate": start_date.strftime("%Y%m%d"),
        "endDate": end_date.strftime("%Y%m%d"),
        "pageSize": 1000, # Assuming 1000 is enough for a day
        "page": 1
    }

    url = "https://storeapi.parcelninja.com/api/v1/inbounds/"
    all_inbounds = []
    session = _session or requests.Session()

    while True:
        response = None
        try:
            response = session.get(url, headers=headers, params=params, timeout=timeout)
            response.raise_for_status()  # Raise an exception for bad status codes
            data = response.json()
            inbounds = data.get("inbounds", [])
            if not inbounds:
                break
            all_inbounds.extend(inbounds)
            
            # Check for next page if API supports it (not clear from docs, but good practice)
            if "next" not in data or not data["next"]:
                break
            params["page"] += 1

        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error occurred while fetching ParcelNinja inbounds: {http_err}")
            if response:
                logger.error(f"Response body: {response.text}")
            break
        except Exception as err:
            logger.error(f"An error occurred while fetching ParcelNinja inbounds: {err}")
            break
            
    return all_inbounds

@st.cache_data(ttl=3600, show_spinner=False)
def fetch_inbound_events(
    inbound_id: int,
    _session: Optional[requests.Session] = None,
    timeout: float = PN_DEFAULT_TIMEOUT,
) -> Optional[dict]:
    """
    Retrieves events for a specific inbound from the ParcelNinja API.
    """
    # Add robust validation for inbound_id
    if not inbound_id or pd.isna(inbound_id):
        return None

    try:
        # Ensure inbound_id is an integer for the URL
        inbound_id_int = int(inbound_id)
    except (ValueError, TypeError):
        logger.warning(f"Could not convert inbound_id '{inbound_id}' to an integer for API call.")
        return None
    headers = {"Authorization": _build_parcelninja_auth_header()}
    return _fetch_pn_inbound_events(_session or get_pn_session(), headers, inbound_id_int)

def process_rma_for_df(rma_summary: dict) -> Optional[dict]:
    """
    Processes a single RMA summary, fetches full details, and scrapes courier status.
    """
    api_key = MY_API_KEY
    if not api_key:
        logger.error("process_rma_for_df: API key is not available.")
        return None

    rma_id = rma_summary.get("rmaId")
    if not rma_id:
        return None

    # 1. Fetch full RMA details
    rma_detail = get_rma_by_id(api_key, STORE_URL, rma_id)
    if not rma_detail:
        rma_detail = rma_summary # Fallback to summary if detail fetch fails

    status = safe_get(rma_detail, "rmaSummary.status") or rma_detail.get("status", "")
    
    # 2. Scrape courier status in parallel for relevant RMAs
    courier_status = None
    if status.lower() in ["approved", "received"]:
        tracking_number = safe_get(rma_detail, "shipments.0.trackingNumber")
        if tracking_number:
            courier_status = scrape_parcel_ninja_status(tracking_number)

    # Structure the data for the DataFrame
    return {
        "rma_id": rma_id,
        "store_url": safe_get(rma_detail, "rmaSummary.storeUrl") or rma_detail.get("storeUrl"),
        "status": status,
        "created_at": safe_parse_date_iso(rma_detail.get("createdAt")),
        "json_data": rma_detail,
        "courier_status": courier_status,
    }

@st.cache_data(ttl=43200, show_spinner=False)
def fetch_and_cache_data() -> pd.DataFrame:
    """
    Fetches all active RMAs from the ReturnGO API, enriches them with details
    and courier statuses, and caches the resulting DataFrame for 12 hours.
    This is the primary data source for the application.
    """
    api_key = MY_API_KEY
    if not api_key:
        st.error("Application error: 'Levis_RETURNGO_API_KEY' is not configured in secrets.")
        return pd.DataFrame()

    progress_bar = st.progress(0, text="Starting data sync...")
    update_sync_status("Fetching ReturnGO data", "Starting data sync...", is_busy=True)

    logger.info("Cache miss. Fetching all active RMAs from ReturnGo API...")
    sync_start = time.time()
    st.session_state.last_sync_time = datetime.now(timezone.utc)

    # 1. Fetch RMA lists for all active statuses
    all_rmas_list = []
    for i, status_val in enumerate(ACTIVE_RG_STATUSES):
        # This progress bar will be shown only on a full cache miss
        progress_text = f"Fetching RMAs with status: {status_val}..."
        update_sync_status("Fetching ReturnGO data", progress_text, is_busy=True) # type: ignore
        progress_bar.progress((i + 1) / (len(ACTIVE_RG_STATUSES) + 1), text=progress_text)
        logger.info(f"Fetching RMAs with status: {status_val}")
        batch = fetch_returngo_rmas(
            api_key=api_key,
            store_url=STORE_URL, # type: ignore
            status=status_val, # type: ignore
        )
        all_rmas_list.extend(batch)

    logger.info(f"Total RMAs fetched from lists: {len(all_rmas_list)}")
    
    # 2. Concurrently process all RMAs
    processed_results = []
    max_workers = st.session_state.get("max_workers_config", MAX_WORKERS)
    total_rmas = len(all_rmas_list)
    details_text = f"Processing {total_rmas} RMA details..."
    update_sync_status("Fetching ReturnGO data", details_text, is_busy=True)
    progress_bar.progress(0.5, text=details_text)
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_rma = {executor.submit(process_rma_for_df, rma): rma for rma in all_rmas_list}
        for i, future in enumerate(concurrent.futures.as_completed(future_to_rma)):
            result = future.result()
            if result:
                processed_results.append(result)
            if total_rmas > 0:
                progress_bar.progress(0.5 + (i + 1) / total_rmas * 0.5, text=f"Processing details... ({i+1}/{total_rmas})")
    
    logger.info(f"Successfully processed details for {len(processed_results)} RMAs.")

    update_sync_status("Fetching ReturnGO data", "ReturnGO data fetched", is_busy=True)
    progress_bar.progress(1.0, text="ReturnGO data fetched")

    if not processed_results:
        return pd.DataFrame()

    # 3. Convert to DataFrame and return
    df = pd.DataFrame(processed_results)
    
    # DEBUG: Check what's in the DataFrame
    logger.debug(f"DataFrame columns: {df.columns.tolist()}")
    if "courier_status" in df.columns:
        logger.debug(f"courier_status column stats - Total: {len(df)}, Non-null: {df['courier_status'].notna().sum()}, Non-empty: {(df['courier_status'] != '').sum()}")
        sample_values = df['courier_status'].head(5).tolist()
        logger.debug(f"Sample courier_status values: {sample_values}")
    
    # Update sync duration
    sync_duration = time.time() - sync_start
    update_perf_metric(PERFORMANCE_FILE, 0, last_sync_duration=sync_duration)
    time.sleep(1)
    
    return df

def perform_incremental_sync():
    """Fetches only RMAs updated since the last sync and merges them into the main DataFrame."""
    last_sync = st.session_state.get("last_sync_time")
    if not last_sync:
        append_ops_log("Cannot perform incremental sync: no last sync time recorded. Please do a full refresh.")
        st.toast("Cannot perform incremental sync. Please do a full refresh first.", icon="⚠️")
        return

    existing_df = st.session_state.get("rma_df")
    if existing_df is None:
        append_ops_log("Cannot perform incremental sync: no data loaded. Please do a full refresh.")
        st.toast("No data loaded to sync against. Please do a full refresh first.", icon="⚠️")
        return

    sync_start_time = time.time()
    # Overlap to avoid missing records at the boundary due to clock drift
    sync_since_dt = last_sync - timedelta(minutes=SYNC_OVERLAP_MINUTES)
    
    append_ops_log(f"Starting incremental sync for updates since {sync_since_dt.strftime('%Y-%m-%d %H:%M:%S')}...")
    
    with st.spinner(f"Fetching updates since {last_sync.strftime('%H:%M:%S')}..."):
        # 1. Fetch updated RMA summaries
        updated_rmas_list = []
        for status_val in ACTIVE_RG_STATUSES:
            batch = fetch_returngo_rmas(
                api_key=str(MY_API_KEY),
                store_url=STORE_URL,
                status=status_val,
                updated_since=sync_since_dt.isoformat()
            )
            updated_rmas_list.extend(batch)

        if not updated_rmas_list:
            append_ops_log("No new updates found.")
            st.session_state.last_sync_time = datetime.now(timezone.utc) # Update time to show we checked
            return

        # 2. Process updated RMAs to get full details
        updated_results = []
        max_workers = st.session_state.get("max_workers_config", MAX_WORKERS)
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_rma = {executor.submit(process_rma_for_df, rma): rma for rma in updated_rmas_list}
            for future in concurrent.futures.as_completed(future_to_rma):
                result = future.result()
                if result:
                    updated_results.append(result)

        if not updated_results:
            append_ops_log("Finished incremental sync. No data changed after detail fetch.")
            st.session_state.last_sync_time = datetime.now(timezone.utc)
            return

        # 3. Merge with existing dataframe
        update_df = pd.DataFrame(updated_results)
        updated_rma_ids = update_df["rma_id"].tolist()
        df_without_updates = existing_df[~existing_df["rma_id"].isin(updated_rma_ids)]
        merged_df = pd.concat([df_without_updates, update_df], ignore_index=True)

        # 4. Update session state
        st.session_state.rma_df = merged_df
        st.session_state.last_sync_time = datetime.now(timezone.utc)
        sync_duration = time.time() - sync_start_time
        update_perf_metric(PERFORMANCE_FILE, 0, last_sync_duration=sync_duration)
        append_ops_log(f"Incremental sync complete. Merged {len(updated_results)} updates in {sync_duration:.2f}s.")
        st.toast(f"Synced {len(updated_results)} updates.", icon="🔄")

def update_single_rma(rma_id: str) -> bool:
    """Fetch latest detail for a single RMA and update the in-memory dataframe."""
    if not rma_id:
        return False

    latest_detail = get_rma_by_id(str(MY_API_KEY), STORE_URL, rma_id)
    if not latest_detail:
        append_ops_log(f"Failed to fetch latest data for RMA {rma_id}.")
        return False
    
    existing_df = st.session_state.get("rma_df")
    if existing_df is None or existing_df.empty:
        append_ops_log(f"Cannot update RMA {rma_id}: no base data loaded.")
        return False

    status = safe_get(latest_detail, "rmaSummary.status") or latest_detail.get("status", "")

    # If status is resolved, remove from the main DF.
    if str(status).lower() in {"done", "closed", "resolved"}:
        st.session_state.rma_df = existing_df[existing_df["rma_id"].astype(str) != str(rma_id)].copy()
        append_ops_log(f"RMA {rma_id} moved out of open table after status '{status}'.")
    else:
        # Re-process the single RMA to get it in the correct DataFrame format
        updated_row_df = pd.DataFrame([process_rma_for_df({"rmaId": rma_id})])
        df_without_rma = existing_df[existing_df["rma_id"].astype(str) != str(rma_id)]
        st.session_state.rma_df = pd.concat([df_without_rma, updated_row_df], ignore_index=True)
        append_ops_log(f"RMA {rma_id} was updated in the table.")
    
    st.session_state.last_rma_update_time = datetime.now(timezone.utc)
    return True

@st.cache_data(ttl=3600, show_spinner="Fetching 'Done' RMAs from API...")
def fetch_recent_done_rmas_for_terminal() -> List[dict]:
    """
        Fetches the most recent 'Done' RMAs and their full details from the API for display.
    """
    api_key = MY_API_KEY
    if not api_key:
        logger.error("API key not configured for fetching done RMAs.")
        return []

    # 1. Fetch the list of recent 'Done' RMA summaries
    done_rma_summaries = fetch_returngo_rmas(
        api_key=api_key,
        store_url=STORE_URL,
        status="Done",
        pagesize=30,
        max_pages=1
    )

    if not done_rma_summaries:
        return []

    # 2. Fetch full details for each RMA to get the 'lastUpdated' timestamp
    detailed_rmas = []
    def get_detail(summary: dict) -> Optional[dict]:
        rma_id = summary.get("rmaId")
        if rma_id:
            return get_rma_by_id(api_key, STORE_URL, rma_id)
        return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = executor.map(get_detail, done_rma_summaries)
        detailed_rmas = [r for r in results if r is not None]

    return detailed_rmas


def force_courier_status_refresh(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a dataframe, re-scrapes courier status for relevant RMAs without clearing the cache,
    and returns an updated dataframe. This function does NOT call the ReturnGo API.
    """
    if df.empty:
        return df

    df_to_update = df.copy()
    
    # Identify rows to scrape: Approved or Received status with a tracking number
    mask = (df_to_update['status'].str.lower().isin(['approved', 'received'])) & \
           (df_to_update['tracking_number'].notna()) & \
           (df_to_update['tracking_number'] != '') & \
           (df_to_update['tracking_number'] != '-')

    rmas_to_scrape = df_to_update[mask]
    
    if rmas_to_scrape.empty:
        append_ops_log("No applicable RMAs found to refresh courier status.")
        return df_to_update

    append_ops_log(f"Refreshing courier status for {len(rmas_to_scrape)} RMAs...")
    progress_bar = st.progress(0, text=f"Starting refresh for {len(rmas_to_scrape)} RMAs...")

    # Use a thread pool to scrape concurrently
    max_workers = st.session_state.get("max_workers_config", MAX_WORKERS)
    def scrape_and_get_status(tracking_number):
        # The scrape function already cleans the indicator, so we can pass it directly
        return tracking_number, scrape_parcel_ninja_status(tracking_number)

    # Get unique tracking numbers to avoid redundant scraping
    tracking_numbers_to_scrape = rmas_to_scrape['tracking_number'].unique().tolist()
    
    new_statuses = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_tn = {executor.submit(scrape_and_get_status, tn): tn for tn in tracking_numbers_to_scrape}
        
        for i, future in enumerate(concurrent.futures.as_completed(future_to_tn)):
            tn, status = future.result()
            if status:
                new_statuses[tn] = status
            if len(tracking_numbers_to_scrape) > 0:
                progress_bar.progress((i + 1) / len(tracking_numbers_to_scrape), text=f"Scraping... ({i+1}/{len(tracking_numbers_to_scrape)})")

    # Update the dataframe. A map is more efficient than iterating rows.
    df_to_update['courier_status'] = df_to_update['tracking_number'].map(new_statuses).fillna(df_to_update['courier_status'])

    # Also update the json_data blob, as other functions might read from it.
    def update_json_data(row):
        if row['tracking_number'] in new_statuses and isinstance(row['json_data'], dict):
            row['json_data']['courier_status'] = new_statuses[row['tracking_number']]
        return row['json_data']
    df_to_update['json_data'] = df_to_update.apply(update_json_data, axis=1)
    
    progress_bar.progress(1.0, text="Refresh complete!")
    append_ops_log(f"Successfully refreshed status for {len(new_statuses)} unique tracking numbers.")
    time.sleep(1) # Let user see the "complete" message
    
    return df_to_update

def update_sync_status(phase: str, detail: str = "", is_busy: Optional[bool] = None, log_activity: bool = True):
    """Update multi-phase sync status in session state and optionally log transitions."""
    status = st.session_state.get("sync_status", {})
    previous_phase = status.get("sync_phase")
    previous_detail = status.get("sync_detail")
    previous_busy = status.get("is_busy")

    if is_busy is None:
        is_busy = bool(previous_busy)

    st.session_state.sync_status = {
        "sync_phase": phase,
        "sync_detail": detail,
        "is_busy": is_busy,
    }

    changed = (phase != previous_phase) or (detail != previous_detail) or (is_busy != previous_busy)
    if log_activity and changed:
        suffix = f" — {detail}" if detail else ""
        append_ops_log(f"Sync phase: {phase}{suffix}")


# ─────────────────────────────────────────────
# ⑨ DATA FRAME ENRICHMENT
# ─────────────────────────────────────────────
def enrich_rma_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Enriches the raw DB dataframe with derived columns and classifications.
    """
    if df.empty:
        return df

    df = df.copy()
    
    # DEBUG: Show info about courier_status column
    if "courier_status" in df.columns:
        non_null_count = df['courier_status'].notna().sum()
        non_empty_count = (df['courier_status'] != '').sum()
        logger.info(f"DataFrame has {len(df)} rows. courier_status column: {non_null_count} non-null, {non_empty_count} non-empty")
        if non_null_count > 0:
            sample_values = df['courier_status'].head(3).tolist()
            logger.info(f"Sample courier_status values: {sample_values}")
    else:
        logger.error("courier_status column is missing from DataFrame!")

    def get_comment_date(comments: list, text_to_find: str) -> Optional[datetime]:
        if not comments:
            return None
        for comment in comments:
            if text_to_find in comment.get("htmlText", ""):
                return safe_parse_date_iso(comment.get("datetime"))
        return None

    # Extract order_name from multiple possible locations
    def extract_order_name(json_data: dict) -> str:
        # Try rmaSummary.order_name first
        order_name = safe_get(json_data, "rmaSummary.order_name")
        if order_name:
            return order_name
        # Try orderDetails.order_name
        order_name = safe_get(json_data, "orderDetails.order_name")
        if order_name:
            return order_name
        # Try top-level order_name (from list endpoint)
        order_name = json_data.get("order_name")
        if order_name:
            return order_name
        return "-"
    
    def extract_customer_name(json_data: dict) -> str:
        """Extracts customer name from shipments, with a fallback to orderDetails."""
        if "shipments" in json_data and isinstance(json_data["shipments"], list) and len(json_data["shipments"]) > 0:
            shipment = json_data["shipments"][0]
            if "customerAddress" in shipment and isinstance(shipment["customerAddress"], dict):
                address = shipment["customerAddress"]
                if "name" in address and address["name"]:
                    return address["name"].strip()
        
        # Fallback to orderDetails if shipments is not available or doesn't have the name
        first_name = safe_get(json_data, "orderDetails.customer.firstName", "")
        last_name = safe_get(json_data, "orderDetails.customer.lastName", "")
        if first_name or last_name:
            return f"{first_name} {last_name}".strip()
        return "-"

    df["order_name"] = df["json_data"].apply(extract_order_name)
    df["customer_name"] = df["json_data"].apply(extract_customer_name)

    # Use the new tracking number extraction with update indicator
    df["tracking_number"] = df["json_data"].apply(get_tracking_number_with_indicator)
    
    # Add tracking was updated flag
    df["tracking_was_updated"] = df["json_data"].apply(has_tracking_number_update)
    
    df["requested_date"] = df["json_data"].apply(lambda x: get_event_date(x, "RMA_CREATED"))
    df["approved_date"] = df["json_data"].apply(lambda x: get_event_date(x, "RMA_APPROVED"))
    df["received_date"] = df["json_data"].apply(get_received_date_from_events_or_comments)
    df["done_date"] = df["json_data"].apply(get_done_date_from_comments)
    df["last_status_update"] = df["json_data"].apply(
        lambda x: safe_parse_date_iso(safe_get(x, "rmaSummary.updatedAt") or x.get("updatedAt"))
    )
    
    # Add credit date and days since credit
    df["credit_date"] = df["json_data"].apply(get_credit_date)
    df["days_since_credit"] = df["credit_date"].apply(
        lambda x: compute_days_since(x) if x else None
    )
    
    # Add last RMA update
    df["last_rma_update"] = df["json_data"].apply(get_last_rma_update)
    
    def extract_resolution_types(json_data: dict) -> str:
        res_types = get_resolution_types(json_data)
        return ", ".join(res_types) if res_types else "-"
    
    df["resolution_type"] = df["json_data"].apply(extract_resolution_types)
    
    def is_resolution_actioned(json_data: dict) -> str:
        """Checks for successful transactions or *released* exchange orders."""
        # 1. Check for any successful transactions
        transactions = safe_get(json_data, "transactions", [])
        if any(str(t.get("status", "")).lower() in ["success", "completed", "succeeded"] for t in transactions):
            return "Yes"

        # 2. Check for released exchange orders (orderName does not start with '#')
        exchange_orders = safe_get(json_data, "exchangeOrders", [])
        if any(eo.get("orderName") and not str(eo.get("orderName")).startswith("#") for eo in exchange_orders):
            return "Yes"
            
        return "No"

    df["resolution_actioned"] = df["json_data"].apply(is_resolution_actioned)

    df["days_since_requested"] = df["requested_date"].apply(compute_days_since)

    def format_tracking_status_for_display(row):
        """
        Classifies the tracking status based on courier_status and RMA status.
        Returns the full event string in format: "Day, DD Mon HH:MM | Status" or "N/A"
        """
        rma_status = str(row.get("status", "")).lower()
        tracking_number = str(row.get("tracking_number", "")).strip()
        # Correctly handle None vs. string 'None'
        courier_status_val = row.get("courier_status")
        courier_status = str(courier_status_val).strip() if courier_status_val is not None else ""

        logger.debug(f"Classifying tracking for RMA with status '{rma_status}', tracking_number '{tracking_number}', and scraped courier_status '{courier_status}'")

        if not tracking_number or tracking_number == "-":
            logger.debug("Result: No tracking number.")
            return "No tracking number"

        # If a pre-scraped status exists (even an error or "N/A"), use it.
        # An empty string means it hasn't been scraped yet.
        if courier_status and courier_status != "None":
            logger.debug(f"Result: Using scraped status '{courier_status}'.")
            return courier_status

        # If no valid pre-scraped status exists, return a default. Do NOT scrape here.
        return "Status not scraped"

    df["tracking_status"] = df.apply(format_tracking_status_for_display, axis=1)

    df["DisplayTrack"] = df.apply(
        lambda r: bool(r.get("tracking_number")) and r.get("status", "").lower() in ["approved", "received"],
        axis=1
    )

    df["is_tracking_updated"] = df["json_data"].apply(has_tracking_update_comment)

    df["is_cc"] = df["tracking_status"].str.lower().str.contains("cancelled", case=False, na=False)

    def detect_failures(row):
        failures = []
        status = row.get("status", "")
        tracking_status = row.get("tracking_status", "")
        resolution_actioned = row.get("resolution_actioned", "")

        if "cancelled" in tracking_status.lower():
            failures.append("COURIER_CANCELLED")
        
        # A key failure: an approved/received RMA that is missing a tracking number
        if status.lower() in ["approved", "received"] and not str(row.get("tracking_number", "")).strip():
            failures.append("MISSING_TRACKING")
        if status.lower() == "received" and resolution_actioned.lower() != "yes":
            failures.append("NO_RESOLUTION")

        return ", ".join(failures)

    df["failures"] = df.apply(detect_failures, axis=1)
    
    # New 'is_flagged' column
    def check_for_flagged_comment(json_data: dict) -> bool:
        comments = safe_get(json_data, "comments", [])
        return any("flag" in str(c.get("htmlText", "")).lower() for c in comments)
    df["is_flagged"] = df["json_data"].apply(check_for_flagged_comment)

    # NEW LOGIC FOR CLIENT ID AND INBOUND STATUS
    min_approved_date = df["approved_date"].min()
    max_approved_date = df["approved_date"].max()

    if pd.notna(min_approved_date) and pd.notna(max_approved_date):
        update_sync_status("Enriching with ParcelNinja", "Matching ParcelNinja inbounds...", is_busy=True)
        lookup_window_start = min_approved_date
        lookup_window_end = max_approved_date
        status_window_start = min_approved_date - timedelta(days=7)
        status_window_end = max_approved_date + timedelta(days=7)
        inbounds_window_start = min(lookup_window_start, status_window_start)
        inbounds_window_end = max(lookup_window_end, status_window_end)

        prefetched_inbounds = st.session_state.get("pn_sync_prefetched_inbounds")
        prefetched_range = st.session_state.get("pn_sync_prefetched_inbounds_range")
        if (
            prefetched_inbounds is None
            or prefetched_range is None
            or prefetched_range[0] != inbounds_window_start
            or prefetched_range[1] != inbounds_window_end
        ):
            prefetched_inbounds = fetch_parcelninja_inbounds(inbounds_window_start, inbounds_window_end)
            st.session_state["pn_sync_prefetched_inbounds"] = prefetched_inbounds
            st.session_state["pn_sync_prefetched_inbounds_range"] = (inbounds_window_start, inbounds_window_end)

        inbounds = prefetched_inbounds
        logger.info("ParcelNinja inbounds fetched once for enrichment: %s", len(inbounds))

        # Build a lightweight mapping from OPT tracking tokens found in inbound records to client IDs.
        tracking_map: Dict[str, str] = {}
        opt_re = re.compile(r'(opt-[^\s"\'"\,]+)', re.IGNORECASE)
        for ib in inbounds:
            client = str(ib.get("clientId", "") or "").strip()
            if not client:
                continue
            try:
                ib_text = json.dumps(ib).lower()
            except Exception:
                ib_text = str(ib).lower()
            for m in opt_re.findall(ib_text):
                tracking_map[m.lower()] = client

        # Create a lookup to find a client_id based on customer name and date
        def normalize_name(text: str) -> str:
            cleaned = re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()
            return cleaned

        inbounds_lookup = {}
        for inbound in inbounds:
            try:
                create_dt = _parse_pn_ts(str(inbound.get("createDate", "")))
                if not create_dt:
                    continue
                create_date = create_dt.date()
                if create_date < lookup_window_start.date() or create_date > lookup_window_end.date():
                    continue
                recipient = (inbound.get("pickupInfo") or {}).get("recipient") or ""
                client_id = str(inbound.get("clientId", "") or "").strip()
                client_id = str(inbound.get("clientId", "") or "").strip() # type: ignore
                if recipient and client_id:
                    normalized_recipient = normalize_name(recipient)
                    if normalized_recipient and (create_date, normalized_recipient) not in inbounds_lookup:
                        inbounds_lookup[(create_date, normalized_recipient)] = client_id
            except (ValueError, TypeError):
                continue

        token_to_client_ids: Dict[str, Set[str]] = {}
        client_id_to_recipients: Dict[str, List[str]] = {}
        for (create_date, normalized_recipient), client_id in inbounds_lookup.items():
            if not client_id:
                continue
            client_id_to_recipients.setdefault(client_id, []).append(normalized_recipient)
            for token in normalized_recipient.split():
                token_to_client_ids.setdefault(token, set()).add(client_id)

        def find_client_id(row):
            # 1. Prioritize matching by tracking number
            try:
                tn = str(row.get("tracking_number", "") or "").replace(" ↻", "").strip().lower()
                if tn and tn in tracking_map:
                    logger.info(f"PN Match for RMA {row['rma_id']}: Found client_id via tracking number '{tn}'.")
                    return tracking_map[tn]
                # try a cleaned token
                tn_clean = re.sub(r'[^a-z0-9\-]', '', tn)
                if tn_clean and tn_clean in tracking_map:
                    logger.info(f"PN Match for RMA {row['rma_id']}: Found client_id via cleaned tracking number '{tn_clean}'.")
                    return tracking_map[tn_clean]
            except Exception:
                pass # Fall through to name/date matching

            # 2. Fallback to name/date matching
            candidate_dates: List[date] = []
            if pd.notna(row["approved_date"]):
                candidate_dates.append(row["approved_date"].date())
            if pd.notna(row["requested_date"]):
                candidate_dates.append(row["requested_date"].date())
            created_at = safe_parse_date_iso(safe_get(row.get("json_data", {}), "createdAt") or row.get("created_at"))
            if created_at:
                candidate_dates.append(created_at.date())

            customer_name = str(row["customer_name"]).strip()
            if not customer_name or customer_name == "-":
                customer_name = str(row.get("order_name", "")).strip()
            if not customer_name or customer_name == "-":
                return "-"

            normalized_customer_name = normalize_name(customer_name)
            if not normalized_customer_name:
                return "-"

            # Attempt exact date + normalized name matches, with neighbor dates to tolerate offsets.
            for base_date in candidate_dates:
                if (base_date, normalized_customer_name) in inbounds_lookup:
                    logger.info(f"PN Match for RMA {row['rma_id']}: Found client_id via exact name/date.")
                    return inbounds_lookup[(base_date, normalized_customer_name)]
                tokens = normalized_customer_name.split()
                for delta in (timedelta(days=-1), timedelta(days=0), timedelta(days=1)):
                    key_date = base_date + delta
                    if (key_date, normalized_customer_name) in inbounds_lookup:
                        logger.info(f"PN Match for RMA {row['rma_id']}: Found client_id via neighbor name/date.")
                        return inbounds_lookup[(key_date, normalized_customer_name)]

            # Token match for exact client IDs
            tokens = normalized_customer_name.split()
            candidate_client_ids: Set[str] = set()
            for token in tokens:
                candidate_client_ids |= token_to_client_ids.get(token, set())

            if len(candidate_client_ids) == 1:
                logger.info(f"PN Match for RMA {row['rma_id']}: Found single client_id via token match.")
                return next(iter(candidate_client_ids))

            # Looser substring matching on recipients for any nearby date candidate
            for base_date in candidate_dates:
                for offset in (-1, 0, 1):
                    check_date = base_date + timedelta(days=offset)
                    for client_id, recipients in client_id_to_recipients.items():
                        for recipient in recipients:
                            if normalized_customer_name in recipient or recipient in normalized_customer_name:
                                logger.info(f"PN Match for RMA {row['rma_id']}: Found client_id via substring match.")
                                return client_id

            return "-"

        df["client_id"] = df.apply(find_client_id, axis=1)
        # Ensure no empty or null client_id values slip through — use '-' as canonical missing marker
        df["client_id"] = df["client_id"].fillna("-").astype(str)
        df.loc[df["client_id"].str.strip() == "", "client_id"] = "-"

        # Attempt to match by tracking number for approved RMAs that have an OPT tracking token
        def _match_by_tracking(row):
            try:
                if row.get("client_id") and row.get("client_id") != "-":
                    return row.get("client_id")
                status = str(row.get("status", "")).lower()
                if status != "approved":
                    return row.get("client_id")
                tn = str(row.get("tracking_number", "") or "").replace(" ↻", "").strip().lower()
                if not tn:
                    return row.get("client_id")
                # direct lookup
                if tn in tracking_map:
                    return tracking_map[tn]
                # try a cleaned token
                tn_clean = re.sub(r'[^a-z0-9\-]', '', tn)
                if tn_clean in tracking_map:
                    return tracking_map[tn_clean]
                return row.get("client_id")
            except Exception:
                return row.get("client_id")

        df["client_id"] = df.apply(_match_by_tracking, axis=1)

        # Capture a small sample of unmatched customer names for diagnostics and tuning
        try:
            unmatched_mask = (df["client_id"] == "-") & (df["customer_name"].notna()) & (df["customer_name"] != "-")
            unmatched_names = df.loc[unmatched_mask, "customer_name"].astype(str).str.strip().unique().tolist()
            sample_unmatched = unmatched_names[:20]
            if sample_unmatched:
                logger.info("ParcelNinja unmatched customer names sample: %s", sample_unmatched)
                st.session_state["pn_unmatched_names_sample"] = sample_unmatched
        except Exception:
            pass

        # Now, fetch statuses for all found client_ids in a batch
        df["inbound_status"] = "-"
        df["inbound_update_date"] = "-"

        # Defensive fill to avoid NaN/empty cells showing up in the UI as blanks
        df["inbound_status"] = df["inbound_status"].fillna("-")
        df["inbound_update_date"] = df["inbound_update_date"].fillna("-")

        # Get unique, valid client IDs from the dataframe
        has_client_id = (df["client_id"] != "-") & (df["client_id"].notna())
        unique_client_ids = set(df.loc[has_client_id, "client_id"].astype(str).str.strip()) if has_client_id.any() else set()
        unique_client_ids.discard("")
        logger.info("ParcelNinja unique client IDs considered after matching: %s", len(unique_client_ids))

        if has_client_id.any():
            matching_count = int(has_client_id.sum())
            update_sync_status(
                "Enriching with ParcelNinja",
                f"Fetching ParcelNinja event history... (0/{matching_count})",
                is_busy=True,
            )
            # Use the new batched status fetcher with reused inbounds
            status_map = fetch_pn_latest_status_by_client(
                status_window_start,
                status_window_end,
                prefetched_inbounds=inbounds,
            )

            if status_map:
                update_sync_status(
                    "Enriching with ParcelNinja",
                    f"Fetching ParcelNinja event history... ({len(status_map)}/{matching_count})",
                    is_busy=True,
                )
                update_sync_status("Enriching with ParcelNinja", "Applying inbound statuses...", is_busy=True)
                # Map the statuses back to the dataframe
                df.loc[has_client_id, "inbound_status"] = df.loc[has_client_id, "client_id"].astype(str).map(lambda c: (status_map.get(str(c)) or {}).get("inbound_status", "-"))
                df.loc[has_client_id, "inbound_update_date"] = df.loc[has_client_id, "client_id"].astype(str).map(lambda c: (status_map.get(str(c)) or {}).get("inbound_update_date", "-"))
            else:
                update_sync_status("Enriching with ParcelNinja", "Applying inbound statuses...", is_busy=True)
        else:
            update_sync_status("Enriching with ParcelNinja", "Applying inbound statuses...", is_busy=True)

    else:
        df["client_id"] = "-"
        df["inbound_status"] = "-"
        df["inbound_update_date"] = "-"



    # DEBUG: Show final tracking_status values
    logger.info(f"Final tracking_status values sample: {df['tracking_status'].head(5).tolist()}")
    logger.info(f"tracking_status value counts: {df['tracking_status'].value_counts().to_dict()}")

    return df


def compute_counts(df: pd.DataFrame) -> Dict[str, int]:
    """
    Computes various counts from the enriched dataframe.
    """
    if df.empty:
        return {}

    counts_dict: Dict[str, int] = {}

    # Total open
    counts_dict["Total Open"] = len(df[df["status"].str.lower().isin(["pending", "approved", "received"])])

    # Status-based
    counts_dict["Pending"] = len(df[df["status"].str.lower() == "pending"])
    counts_dict["Approved"] = len(df[df["status"].str.lower() == "approved"])
    counts_dict["Received"] = len(df[df["status"].str.lower() == "received"])

    # Tracking-based
    counts_dict["In Transit"] = len(df[df["tracking_status"].str.lower().str.contains("routing delivery|out for delivery", na=False)])
    counts_dict["Submitted"] = len(df[(df["status"].str.lower() == "approved") & (df["tracking_status"].str.lower().str.contains("submitted to courier", na=False))])
    counts_dict["Delivered"] = len(df[(df["status"].str.lower() == "approved") & (df["tracking_status"].str.lower().str.contains("delivered", na=False))])
    counts_dict["Courier Cancelled"] = len(df[df["is_cc"]])
    counts_dict["No Tracking"] = len(df[
        (df["status"].str.lower().isin(["approved", "received"])) &
        ((df["tracking_number"] == "") | (df["tracking_number"] == "-"))
    ])

    # Resolution
    counts_dict["Resolution Actioned"] = len(df[df["resolution_actioned"].str.lower() == "yes"])
    counts_dict["No Resolution Actioned"] = len(df[
        (df["status"].str.lower() == "received") & (df["resolution_actioned"].str.lower() != "yes")
    ])

    # Flagged
    counts_dict["Flagged"] = int(df["is_flagged"].sum())

    # Ready to close (neon blue rows)
    counts_dict["Ready to close: Refund to credit"] = len(df[
        (df["resolution_type"].astype(str).str.contains("RefundToStoreCredit", na=False))
        & (df["resolution_actioned"].astype(str).str.lower() == "yes")
        & (pd.to_numeric(df["days_since_credit"], errors="coerce") >= 30)
    ])

    return counts_dict

# ─────────────────────────────────────────────
# ⑩ STREAMLIT UI - OPS LOG
# ─────────────────────────────────────────────
def append_ops_log(message: str):
    """Appends a message to the in-memory ops log for display."""
    if "ops_log" not in st.session_state:
        st.session_state.ops_log = []
    sync_status = st.session_state.get("sync_status", {})
    sync_phase = sync_status.get("sync_phase") or "Idle"
    sync_detail = sync_status.get("sync_detail") or ""
    phase_suffix = f" | phase={sync_phase}"
    if sync_detail:
        phase_suffix += f" ({sync_detail})"
    timestamp = datetime.now(timezone.utc).astimezone(DISPLAY_TZ).strftime("%Y-%m-%d %H:%M:%S") + f" {DISPLAY_TZ_NAME}"
    st.session_state.ops_log.append(f"[{timestamp}] {message}{phase_suffix}")


def show_ops_log():
    """Displays the ops log in a styled container."""
    if "ops_log" not in st.session_state or not st.session_state.ops_log:
        st.info("No operations logged yet.")
        return
    
    log_text = "\n".join(st.session_state.ops_log[-50:])
    st.markdown(
        f"""
        <div style='background-color: #0a0a0a; color: #00ff00; padding: 15px; 
                    border-radius: 8px; font-family: "Courier New", monospace; 
                    font-size: 12px; max-height: 400px; overflow-y: auto; 
                    border: 1px solid #00ff00;'>
        <pre style='margin: 0; white-space: pre-wrap;'>{html_lib.escape(log_text)}</pre>
        </div>
        """,
        unsafe_allow_html=True
    )

@st.dialog("RMA Details")
def show_timeline_details_dialog(details_df, event_type, selected_date):
    st.markdown(f"#### Details for {len(details_df)} RMA(s) on {selected_date.strftime('%b %d, %Y')}")

    # --- Summary Section ---
    st.markdown("##### Summary")
    
    status_counts = details_df['status'].value_counts()
    # Explode comma-separated strings into separate rows for accurate counting
    resolution_counts = details_df['resolution_type'].str.split(', ').explode().str.strip().value_counts()
    resolution_counts = resolution_counts[resolution_counts.index != '-'] # Exclude non-resolutions

    col1, col2 = st.columns(2)
    with col1:
        st.write("**Status Breakdown**")
        st.dataframe(status_counts, use_container_width=True)
    
    with col2:
        st.write("**Resolution Breakdown**")
        if not resolution_counts.empty:
            st.dataframe(resolution_counts, use_container_width=True)
        else:
            st.info("No specific resolutions.")
    
    st.markdown("---")
    st.markdown("#### RMA List")
    st.dataframe(details_df[['rma_id', 'order_name', 'customer_name', 'status', 'tracking_status', 'resolution_type']], hide_index=True, use_container_width=True)

    if st.button("Close"):
        st.session_state.timeline_dialog_data = None
        st.rerun()

def render_interactive_timeline(df: pd.DataFrame):
    """Renders the tabbed, interactive RMA Status Timeline chart."""
    st.markdown("### 📅 RMA Status Timeline")
    if df.empty:
        st.info("No data available for timeline.")
        return

    # 1. Prepare a long-form DataFrame of all relevant events
    events = []
    for _, row in df.iterrows():
        rma_id = row['rma_id']
        if pd.notna(row.get('requested_date')):
            events.append({'rma_id': rma_id, 'Date': row['requested_date'].date(), 'Event Type': 'Requested'})
        if pd.notna(row.get('approved_date')):
            events.append({'rma_id': rma_id, 'Date': row['approved_date'].date(), 'Event Type': 'Approved'})
        
        if 'Delivered' in str(row.get('tracking_status', '')):
            delivered_date = _parse_timeline_event_date(row['tracking_status'])
            if delivered_date:
                events.append({'rma_id': rma_id, 'Date': delivered_date.date(), 'Event Type': 'Delivered'})

        resolved_dates = [d for d in [row.get('credit_date'), row.get('done_date')] if pd.notna(d)]
        if resolved_dates:
            resolved_date = max(resolved_dates)
            events.append({'rma_id': rma_id, 'Date': resolved_date.date(), 'Event Type': 'Resolved'})

    if not events:
        st.info("No timeline events found in the data.")
        return

    events_df = pd.DataFrame(events)

    # 2. Create UI with tabs and render charts
    tab_req, tab_app, tab_del, tab_res = st.tabs(["Returns Requested", "Returns Approved", "Returns Delivered", "Return Resolutions"])
    
    event_types = {"Requested": tab_req, "Approved": tab_app, "Delivered": tab_del, "Resolved": tab_res}
    selection_info = None

    for event_type, tab in event_types.items():
        with tab:
            chart_df = events_df[events_df['Event Type'] == event_type]
            if chart_df.empty:
                st.info(f"No '{event_type}' events to display.")
                continue

            chart_data = chart_df.groupby('Date').size().reset_index(name='Count')
            selection = alt.selection_point(fields=['Date'], on='click', empty=True, name=f"select_{event_type}")

            line = alt.Chart(chart_data).mark_line(color="#FFFFFF", strokeWidth=2).encode(
                x=alt.X('Date:T', title='Date'),
                y=alt.Y('Count:Q', title='Number of Events'),
            )
            glow = alt.Chart(chart_data).mark_point(color="#FFFFFF", size=260, opacity=0.2).encode(
                x='Date:T',
                y='Count:Q',
            )
            points = alt.Chart(chart_data).mark_point(size=85, filled=True).encode(
                x='Date:T',
                y='Count:Q',
                tooltip=['Date:T', 'Count:Q'],
                color=alt.condition(selection, alt.value('orange'), alt.value('steelblue'))
            ).add_params(selection)

            chart = (line + glow + points).properties(title=f'Volume of {event_type} Events', height=300).interactive()

            chart_key = f"timeline_chart_{event_type}"
            st.altair_chart(chart, use_container_width=True, on_select='rerun', key=chart_key)

            if st.session_state.get(chart_key) and st.session_state[chart_key].get(f"select_{event_type}"):
                selected_data = st.session_state[chart_key][f"select_{event_type}"]
                if selected_data:
                    selected_timestamp_ms = selected_data[0]['Date']
                    selected_date = pd.to_datetime(selected_timestamp_ms, unit='ms').date()
                    selection_info = {'event_type': event_type, 'date': selected_date}

    # 3. Show dialog if a selection was made
    if selection_info:
        event_type, selected_date = selection_info['event_type'], selection_info['date']
        rma_ids_for_date = events_df[(events_df['Event Type'] == event_type) & (events_df['Date'] == selected_date)]['rma_id'].unique()
        details_df = df[df['rma_id'].isin(rma_ids_for_date)].copy()

        show_timeline_details_dialog(details_df, event_type, selected_date)

# ─────────────────────────────────────────────
# ⑪ STREAMLIT UI - DIALOGS
# ─────────────────────────────────────────────
@st.dialog("RMA Actions", width="large")
def show_rma_actions_dialog(row_data: pd.Series):
    """Shows a dialog with action buttons for a selected RMA."""
    rma_id = extract_rma_id_from_display_value(row_data.get("RMA ID", row_data.get("rma_id", "")))
    shipment_id = safe_get(row_data.get("json_data", {}), "shipments.0.shipmentId")
    existing_tracking = (
        row_data.get("tracking_number")
        or extract_tracking_reference_from_display_value(row_data.get("Tracking Number", ""))
        or safe_get(row_data.get("json_data", {}), "shipments.0.trackingNumber")
        or ""
    )

    st.subheader(f"Actions for RMA: {rma_id}")

    tab_comments, tab_tracking, tab_details = st.tabs(["Comment Timeline", "Update Tracking", "RMA Details"])

    with tab_comments:
        st.markdown("#### Comment History")
        comments = safe_get(row_data.get("json_data", {}), "comments", [])
        with st.container(height=400):
            if not comments:
                st.info("No comments found for this RMA.")
            else:
                sorted_comments = sorted(comments, key=lambda c: c.get('datetime', ''), reverse=True)
                for comment in sorted_comments:
                    comment_date = format_date(safe_parse_date_iso(comment.get('datetime')))
                    author = comment.get('triggeredBy', 'System')
                    html_text = comment.get('htmlText', 'No content.')
                    st.markdown(f"**{comment_date}** by *{author}*")
                    st.markdown(f"> {html_text}", unsafe_allow_html=True)
                    st.markdown("---")

        # Form to add a new comment
        with st.form(key=f"comment_form_{rma_id}"):
            new_comment_text = st.text_area("Add a new comment:", height=100, key=f"comment_input_{rma_id}", disabled=st.session_state.get("is_busy", False))
            submit_comment = st.form_submit_button("Post Comment", disabled=st.session_state.get("is_busy", False))

            if submit_comment and new_comment_text and new_comment_text.strip():
                if MY_API_KEY:
                    success = post_rma_comment(MY_API_KEY, STORE_URL, rma_id, new_comment_text)
                    if success:
                        st.success("Comment posted successfully!")
                        append_ops_log(f"Posted comment to RMA {rma_id}.")
                        st.cache_data.clear()
                        st.rerun()
                    else:
                        st.error("Failed to post comment.")
                else:
                    st.error("Cannot post comment: API Key is not configured.")

    with tab_tracking:
        st.markdown("#### Update Tracking")
        st.caption("Update the tracking reference through the RG ActionReport tracking API.")
        new_tracking_number = st.text_input(
            "New Tracking Reference",
            value=existing_tracking,
            placeholder="e.g., OPT-123456789",
            key=f"tracking_reference_input_{rma_id}",
            disabled=st.session_state.get("is_busy", False),
        )
        is_valid_tracking, tracking_validation_error = validate_tracking_reference(new_tracking_number) if new_tracking_number else (False, "Tracking number cannot be empty.")
        if new_tracking_number and not is_valid_tracking:
            st.warning(tracking_validation_error)

        col_api_update, col_full_sequence = st.columns(2)

        with col_api_update:
            if st.button("Update Tracking Reference", key=f"submit_tracking_reference_{rma_id}", disabled=st.session_state.get("is_busy", False) or not is_valid_tracking):
                success, message = update_tracking_via_api(
                    rma_id=rma_id,
                    new_tracking_ref=new_tracking_number,
                    shipment_id=shipment_id,
                    row_data=row_data,
                )
                if success:
                    st.success(message)
                    append_ops_log(format_tracking_update_log_entry(rma_id, existing_tracking, new_tracking_number))
                    st.cache_data.clear()
                    update_single_rma(rma_id)
                    st.rerun()
                else:
                    st.error(message)
                    append_ops_log(f"Tracking reference update failed for RMA {rma_id}: {message}")

        with col_full_sequence:
            if st.button("Run Full Update Sequence", key=f"submit_tracking_{rma_id}", disabled=st.session_state.get("is_busy", False) or not is_valid_tracking):
                if run_update_sequence(rma_id, new_tracking_number):
                    st.cache_data.clear()
                    st.rerun()

    with tab_details:
        st.markdown("#### Raw RMA Data")
        # Displaying the raw JSON data can be very useful for debugging
        st.json(row_data.get("json_data", {}))


@st.dialog("Update Tracking", width="large")
def show_update_tracking_dialog(row_data: pd.Series):
    """Shows a dialog to update the tracking number for an RMA."""
    rma_id = row_data.get("rma_id", "")
    shipment_id = safe_get(row_data.get("json_data", {}), "shipments.0.shipmentId")
    existing_tracking = row_data.get("tracking_number", "")

    st.subheader(f"Update Tracking for RMA: {rma_id}")

    new_tracking_number = st.text_input("New Tracking Number (OPT-)", value=existing_tracking, disabled=st.session_state.get("is_busy", False))

    if st.button("Submit Update", disabled=st.session_state.get("is_busy", False)):
        if not shipment_id:
            st.error("Cannot update: No shipment ID found for this RMA. Please ensure the RMA has a shipment.")
        elif new_tracking_number and new_tracking_number.strip():
            # Actually call the push_tracking_update function
            success, message = push_tracking_update(rma_id, shipment_id, new_tracking_number, STORE_URL)
            if success:
                st.success(f"Successfully updated tracking for Shipment ID {shipment_id} to '{new_tracking_number}'.")
                st.cache_data.clear()
                st.rerun()
            else:
                st.error(f"Failed to update tracking: {message}")
        else:
            st.warning("Tracking number cannot be empty.")

@st.dialog("Data Table Log", width="large")
def show_data_table_log():
    """Shows the operations log in a dialog."""
    st.subheader("Activity Log")
    show_ops_log()
    if st.button("Clear Log", disabled=st.session_state.get("is_busy", False)):
        st.session_state.ops_log = []
        st.rerun()

# ─────────────────────────────────────────────
# ⑫ STREAMLIT UI - FILTER LOGIC
# ─────────────────────────────────────────────
def apply_filters(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies active filters from session_state to the dataframe.
    """
    if df.empty or not st.session_state.active_filters:
        return df

    combined_mask = pd.Series(False, index=df.index)

    # Map filter names to conditions
    filter_map = {
        "Pending Requests": lambda d: d["status"].str.lower() == "pending",
        "Received": lambda d: d["status"].str.lower() == "received",
        "Courier Cancelled": lambda d: d["tracking_status"].str.lower().str.contains("courier cancelled", na=False),
        "RG APPROVED > SUBMITTED TO COURIER": lambda d: (d["status"].str.lower() == "approved") & d["tracking_status"].str.lower().str.contains("submitted to courier", na=False),
        "Approved > Delivered": lambda d: (d["status"].str.lower() == "approved") & d["tracking_status"].str.lower().str.contains("delivered", na=False),
        "No Tracking": lambda d: (d["status"].str.lower().isin(["approved", "received"])) & ((d["tracking_number"] == "") | (d["tracking_number"] == "-")),
        "Resolution Actioned": lambda d: d["resolution_actioned"].str.lower() == "yes",
        "No Resolution Actioned": lambda d: (d["status"].str.lower() == "received") & (d["resolution_actioned"].str.lower() != "yes"),
        "In Transit": lambda d: d["tracking_status"].str.lower().str.contains("routing delivery|out for delivery", na=False),
        "Ready to close: Refund to credit": lambda d: (
            d["resolution_type"].astype(str).str.contains("RefundToStoreCredit", na=False)
            & (d["resolution_actioned"].astype(str).str.lower() == "yes")
            & (pd.to_numeric(d["days_since_credit"], errors="coerce") >= 30)
        ),
        "Flagged": lambda d: d["is_flagged"],
    }

    for active_filter in st.session_state.active_filters:
        if active_filter in filter_map:
            combined_mask |= filter_map[active_filter](df)

    return df[combined_mask]


def apply_additional_filters(df: pd.DataFrame) -> pd.DataFrame:
    """Apply additional filters from the filter bar."""
    if df.empty:
        return df
    
    filtered = df.copy()
    
    # Status filter
    status_multi = st.session_state.get("status_multi", [])
    if status_multi:
        filtered = filtered[filtered["status"].isin(status_multi)]
    
    # Resolution type filter
    res_multi = st.session_state.get("res_multi", [])
    if res_multi:
        filtered = filtered[filtered["resolution_type"].isin(res_multi)]
    
    # Resolution actioned filter
    actioned_multi = st.session_state.get("actioned_multi", [])
    if actioned_multi:
        if set(actioned_multi) == {"Yes"}:
            filtered = filtered[filtered["resolution_actioned"].str.lower() == "yes"]
        elif set(actioned_multi) == {"No"}:
            filtered = filtered[filtered["resolution_actioned"].str.lower() != "yes"]
    
    # Tracking status filter
    tracking_multi = st.session_state.get("tracking_multi", [])
    if tracking_multi:
        filtered = filtered[filtered["tracking_status"].isin(tracking_multi)]
    
    # Search query
    search_query = st.session_state.get("search_query_input", "").strip()
    if search_query:
        search_lower = search_query.lower()
        mask = (
            filtered["rma_id"].astype(str).str.lower().str.contains(search_lower, na=False) |
            filtered["order_name"].astype(str).str.lower().str.contains(search_lower, na=False) |
            filtered["tracking_number"].astype(str).str.lower().str.contains(search_lower, na=False) |
            filtered["customer_name"].astype(str).str.lower().str.contains(search_lower, na=False)
        )
        filtered = filtered[mask]
    
    return filtered


def clear_all_filters():
    """Clear all filter selections."""
    st.session_state.status_multi = []
    st.session_state.res_multi = []
    st.session_state.actioned_multi = []
    st.session_state.tracking_multi = []
    st.session_state.search_query_input = ""
    st.session_state.active_filters = set()

def normalize_search_value(value: Any) -> str:
    """Normalizes a value for searching by converting to lowercase and stripping whitespace."""
    text = "" if value is None else str(value)
    return re.sub(r"\s+", " ", text).strip().lower()

def parse_search_terms(query: str) -> List[str]:
    """Parses a search query into a list of individual terms, splitting by comma or newline."""
    if not query:
        return []
    terms: List[str] = []
    for raw_term in re.split(r"[,\r\n]+", str(query)):
        term = normalize_search_value(raw_term)
        if term:
            terms.append(term)
    return terms

def build_search_mask(df: pd.DataFrame, query: str) -> pd.Series:
    """Builds a boolean mask for the DataFrame based on a search query."""
    normalized_query = normalize_search_value(query)
    if not normalized_query:
        return pd.Series(True, index=df.index)

    search_columns = ["rma_id", "order_name", "tracking_number", "customer_name", "client_id"]
    normalized_series = {
        col: df[col].astype(str).map(normalize_search_value) for col in search_columns if col in df.columns
    }

    terms = parse_search_terms(query)
    if len(terms) <= 1:
        # Single-term search: use 'contains' for partial matching across all search columns.
        combined_mask = pd.Series(False, index=df.index)
        for series in normalized_series.values():
            combined_mask |= series.str.contains(normalized_query, na=False, regex=False)
        return combined_mask
    
    # Multi-term search: use 'isin' for exact, full-term matching.
    term_set = set(terms)
    hashless_terms = {term.lstrip("#") for term in terms}
    
    # Initialize an empty mask.
    combined_mask = pd.Series(False, index=df.index)

    # Apply 'isin' check for each searchable column.
    for col, series in normalized_series.items():
        if col == "order_name":
            # Special handling for order numbers which might have a '#' prefix.
            order_hashless = series.str.lstrip("#")
            combined_mask |= series.isin(term_set) | order_hashless.isin(hashless_terms)
        else:
            # Standard exact match for other fields.
            combined_mask |= series.isin(term_set)

    return combined_mask

def toggle_filter(filter_name: str):
    """Adds or removes a filter from the active set."""
    if "active_filters" not in st.session_state:
        st.session_state.active_filters = set()
    
    if filter_name in st.session_state.active_filters:
        st.session_state.active_filters.remove(filter_name)
    else:
        st.session_state.active_filters.add(filter_name)

# ─────────────────────────────────────────────
# ⑬ STREAMLIT UI - CSS STYLING
# ─────────────────────────────────────────────
def inject_custom_css():
    """Injects custom CSS for enhanced UI styling."""
    accent = "#57a6ff"
    accent_dark = "#1f4479"
    rgb_accent = "87, 166, 255"

    st.markdown(
        f"""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Barlow:wght@300;400;500;600&display=swap');

        :root {{
            /* Crisp but lighter dark palette */
            --bg:        #1b3150;   /* calmer page background */
            --bg2:       #243f63;   /* sidebar / panels */
            --bg3:       #2f567c;   /* cards and surfaces */
            --border:    #3f5f86;   /* softer border */
            --border2:   #5280a4;   /* secondary border */
            --text:      #e9f1fb;   /* softer white */
            --muted:     #9bb1cc;   /* calmer muted */
            --dim:       #96aebc;   /* dim text */
            --accent:    {accent};
            --accent-dk: {accent_dark};
            --green:     #4dc37b;
            --amber:     #f3c75a;
            --red:       #f28c8b;
            --purple:    #8a7eff;
            --blue:      #5b97ff;
            --font:      'Barlow', sans-serif;
            --font-cond: 'Barlow Condensed', sans-serif;
            --mono:      'IBM Plex Mono', monospace;
        }}

        html, body, [class*="css"] {{
            font-family: var(--font) !important;
            background-color: var(--bg) !important;
            color: var(--text) !important;
        }}

        #MainMenu, footer {{ visibility: hidden; }}
        .stDeployButton {{ display: none !important; }}
        .block-container {{ padding: 2rem 1.5rem 4rem !important; max-width: 100% !important; }}

        /* Header */
        .main-header h1 {{
            font-family: var(--font-cond);
            font-size: 2.2rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--accent);
            text-align: center;
            padding: 1rem 0;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, {accent_dark}22 0%, {accent}11 50%, transparent 100%);
            border-bottom: 2px solid {accent}44;
        }}

        /* Connection status bar */
        .connection-status {{
            font-family: var(--mono);
            font-size: 0.75rem;
            color: var(--muted);
            text-align: center;
            margin-bottom: 1.5rem;
        }}

        /* Metric cards */
        .metric-card {{
            background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02));
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1rem 1rem 0.6rem;
            text-align: center;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: border-color 0.18s, background 0.18s, box-shadow 0.18s, transform 0.12s;
            box-shadow: 0 6px 18px rgba(2,6,23,0.08);
        }}
        .metric-card:hover {{
            border-color: var(--accent);
            background: rgba({rgb_accent},0.06);
            box-shadow: 0 10px 30px rgba(2,6,23,0.12);
            transform: translateY(-3px);
        }}
        .metric-card.selected {{
            border-color: var(--accent);
            background: rgba({rgb_accent},0.12);
        }}
        .metric-card .count {{
            font-family: var(--font-cond);
            font-size: 2.2rem; font-weight: 800;
            color: var(--text); line-height: 1;
            transition: color 0.15s;
        }}
        .metric-card .label {{
            font-size: 0.78rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.06em;
            color: var(--muted); margin-top: 0.35rem;
        }}
        .metric-card.selected .count {{ color: var(--accent); }}

        /* Filter button (invisible underneath metric card) */
        .filter-button-wrapper .stButton button {{
            opacity: 0 !important;
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100%; height: 100%;
            cursor: pointer !important;
        }}
        .metric-filter-toggle {{ position: relative; }}
        .metric-filter-toggle [data-testid="stCheckbox"] {{
            position: absolute;
            top: 5px; right: 5px;
        }}

        /* Sidebar */
        [data-testid="stSidebar"] {{
            background: var(--bg2) !important;
            border-right: 1px solid var(--border) !important;
        }}
        [data-testid="stSidebar"] .stButton button {{
            width: 100%;
        }}

        /* General UI Elements */
        .stButton button {{
            background: var(--bg3) !important;
            border: 1px solid var(--border) !important;
            color: var(--text) !important;
            font-family: var(--font) !important;
            font-size: 0.82rem !important;
            border-radius: 6px !important;
            transition: background 0.15s, border-color 0.15s;
        }}
        .stButton button:hover {{
            border-color: var(--accent) !important;
            background: rgba({rgb_accent},0.1) !important;
        }}
        button[kind="primary"] {{
            background: var(--accent) !important;
            border-color: var(--accent) !important;
            color: #000 !important;
            font-weight: 700 !important;
        }}

        div[data-testid="stExpander"] {{
            background: var(--bg3) !important;
            border: 1px solid var(--border) !important;
            border-radius: 6px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
        }}

        .stDataFrame {{
            border: 1px solid var(--border) !important;
            border-radius: 6px !important;
        }}

        /* Panels and Logs */
        .api-panel, .perf-metrics, .activity-log {{
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
        }}
        .api-panel h3 {{
            color: var(--accent);
            font-family: var(--mono);
            font-size: 0.82rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 8px;
        }}
        .api-setting {{
            margin-bottom: 8px;
            padding: 7px 9px;
            background: rgba(0,0,0,0.2);
            border-radius: 5px;
        }}
        .api-setting-label {{
            color: var(--muted);
            font-family: var(--mono);
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }}
        .api-setting-value {{
            color: var(--accent);
            font-family: var(--mono);
            font-weight: 600; 
            font-size: 0.78rem;
        }}

        .perf-metrics {{
            display: flex;
            justify-content: space-around;
        }}
        .perf-metric {{ text-align: center; }}
        .perf-metric .value {{ font-family:var(--mono); font-size:1rem; font-weight:700; color:var(--blue); }}
        .perf-metric .label {{ font-family:var(--mono); font-size:0.6rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.07em; }}

        .activity-log pre {{
            background-color: var(--bg2) !important;
            color: var(--green) !important;
            font-family: var(--mono) !important;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--border2);
            padding: 10px;
            border-radius: 6px;
        }}

        /* Table actions */
        .table-actions-left {{ display: flex; gap: 10px; margin-bottom: 10px; }}
        .rows-count {{ font-size: 14px; color: var(--muted); margin-bottom: 10px; }}
        .rows-count .value {{ font-weight: bold; color: var(--green); }}
        .sync-time-bar {{
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 5px;
            padding: 8px;
            text-align: center;
            color: var(--dim);
            font-size: 12px;
            margin-top: 10px;
        }}

        .busy-overlay-main,
        .busy-overlay-sidebar {{
            position: fixed;
            background: rgba(0, 0, 0, 0.45);
            z-index: 9997;
            pointer-events: none;
            backdrop-filter: blur(1px);
        }}
        .busy-overlay-main {{ top: 0; left: max(21rem, 20%); right: 0; bottom: 0; }}
        .busy-overlay-sidebar {{ top: 0; left: 0; width: min(21rem, 20%); bottom: 0; }}

        .processing-banner {{
            position: sticky;
            top: 0.5rem;
            z-index: 10000;
            margin: 0.5rem 0 1rem 0;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(253, 224, 71, 0.8);
            background: rgba(82, 58, 0, 0.9);
            color: #fde68a;
            font-weight: 600;
        }}
        [data-testid="stSidebarCollapseButton"],
        [data-testid="stExpandSidebarButton"] {{
            position: fixed !important;
            top: 0.9rem !important;
            left: 0.65rem !important;
            z-index: 10003 !important;
            pointer-events: auto !important;
            opacity: 1 !important;
        }}

        [data-testid="stSidebarCollapseButton"] button,
        [data-testid="stExpandSidebarButton"] {{
            color: #ffffff !important;
        }}

        [data-testid="stSidebarCollapseButton"] button:hover,
        [data-testid="stExpandSidebarButton"]:hover {{
            background: var(--bg3) !important;
            border-color: #ffffff !important;
        }}

        [data-testid="stSidebarCollapseButton"] button:focus-visible,
        [data-testid="stExpandSidebarButton"]:focus-visible {{
            outline: 2px solid #ffffff !important;
            outline-offset: 2px !important;
        }}

        [data-testid="stExpandSidebarButton"] {{
            color: #ffffff !important;
        }}
        </style>
        """,
        unsafe_allow_html=True
    )


def inject_sidebar_toggle_fallback_js():
    """Adds a minimal fallback that hardens sidebar control positioning if CSS did not apply."""
    if version.parse(st.__version__) < version.parse("1.54.0"):
        return

    components.html(
        """
        <script>
          (() => {
            const applyFallback = (el) => {
              if (!el) return;
              const r = el.getBoundingClientRect();
              const computed = window.getComputedStyle(el);
              const offscreen = r.right < 0 || r.left > window.innerWidth;
              const notFixed = computed.position !== 'fixed';
              const weakLayer = Number.parseInt(computed.zIndex || '0', 10) < 10003;
              if (!(offscreen || notFixed || weakLayer)) return;

              Object.assign(el.style, {
                position: 'fixed',
                top: '0.9rem',
                left: '0.65rem',
                zIndex: '10003',
                pointerEvents: 'auto',
                opacity: '1'
              });
            };

            const sync = () => {
              applyFallback(document.querySelector('[data-testid="stSidebarCollapseButton"]'));
              applyFallback(document.querySelector('[data-testid="stExpandSidebarButton"]'));
            };

            sync();
            const observer = new MutationObserver(sync);
            observer.observe(document.body, { childList: true, subtree: true, attributes: true });
            setTimeout(() => observer.disconnect(), 8000);
          })();
        </script>
        """,
        height=0,
    )

def create_tracking_url(tracking_number: str) -> str:
    """Creates tracking URL, handling the update indicator."""
    if not tracking_number or tracking_number == "-":
        return "-"
    
    # Remove the update indicator for the URL
    clean_tracking = tracking_number.replace(" ↻", "").strip()
    return f"https://portal.thecourierguy.co.za/track?ref={clean_tracking}"

def extract_rma_id_from_display_value(value: Any) -> str:
    """Extract the raw RMA ID from either a display URL or a plain ID value."""
    text = "" if value is None else str(value).strip()
    if not text or text == "-":
        return ""
    parsed = urlparse(text)
    query_rma_id = parse_qs(parsed.query).get("rmaid", [""])[0]
    return unquote(query_rma_id or text).strip()

def extract_tracking_reference_from_display_value(value: Any) -> str:
    """Extract the tracking reference from either a courier URL or a plain tracking value."""
    text = "" if value is None else str(value).strip()
    if not text or text == "-":
        return ""
    parsed = urlparse(text)
    query_ref = parse_qs(parsed.query).get("ref", [""])[0]
    tracking_ref = unquote(query_ref or text).replace(" ↻", "").strip()
    return "" if tracking_ref == "-" else tracking_ref

def on_metric_filter_checkbox_change(filter_name: str, label: str, checkbox_key: str):
    """Synchronizes checkbox state with filter state and shows feedback toasts."""
    is_checked = bool(st.session_state.get(checkbox_key, False))
    is_active = filter_name in st.session_state.active_filters

    if is_checked != is_active:
        toggle_filter(filter_name)

    if is_checked:
        st.toast(f"{label} Selected")
    else:
        st.toast(f"{label} Deselected")


def render_metric_card(
    column,
    label: str,
    count_key: str,
    filter_name: str,
    help_text: str = "",
    card_accent: str = "#3a8dff",
    count_color: str = "#7bd6ff",
):
    """Renders a single metric card and handles its click logic."""
    count = counts.get(count_key, 0)
    is_selected = filter_name in st.session_state.active_filters
    checkbox_key = f"filter_checkbox_{filter_name}"

    if st.session_state.get(checkbox_key) != is_selected:
        st.session_state[checkbox_key] = is_selected
    
    card_class = "metric-card selected" if is_selected else "metric-card"
    
    with column:
        st.markdown(
            f"""
            <div class='{card_class}' title='{help_text}' style='--card-accent:{card_accent}; --count-color:{count_color};'>
                <div class='count'>{count}</div>
                <div class='label'>{label}</div>
            </div>
            """,
            unsafe_allow_html=True
        )
        st.markdown("<div class='filter-button-wrapper metric-filter-toggle'>", unsafe_allow_html=True)
        st.checkbox(
            "Apply filter",
            key=checkbox_key,
            on_change=on_metric_filter_checkbox_change,
            args=(filter_name, label, checkbox_key),
        )
        st.markdown("</div>", unsafe_allow_html=True)

# ─────────────────────────────────────────────
# ⑭ STREAMLIT UI - MAIN FUNCTION
# ─────────────────────────────────────────────
def main():
    """Main Streamlit application entry point."""
    global counts

    st.set_page_config(
        page_title="Levi's ReturnGO Ops Dashboard",
        page_icon="📦",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    # Disconnected state overlay
    if st.session_state.get("disconnected"):
        st.markdown(
            """
            <style>
            .shutdown-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.9); z-index: 9998;
                display: flex; justify-content: center; align-items: center;
                color: white; text-align: center;
            }
            .shutdown-overlay h2 { color: #ff4b4b; }
            </style>
            <div class="shutdown-overlay">
                <div>
                    <h2>System Shutdown</h2>
                    <p>All processing has been stopped. Please close the browser tab.</p>
                </div>
            </div>
            """, unsafe_allow_html=True)
        st.stop() # type: ignore
    

    inject_custom_css()
    inject_sidebar_toggle_fallback_js()

    # Initialize session state
    if "active_filters" not in st.session_state:
        st.session_state.active_filters = set()
    if "last_sync_time" not in st.session_state:
        st.session_state.last_sync_time = None
    if "session_access_time" not in st.session_state:
        st.session_state.session_access_time = datetime.now(timezone.utc)
    if "ops_log" not in st.session_state:
        st.session_state.ops_log = []
    if "user_settings" not in st.session_state:
        st.session_state.user_settings = _load_file(USER_SETTINGS_FILE, UserSettings)
    if "performance_metrics" not in st.session_state:
        st.session_state.performance_metrics = _load_file(PERFORMANCE_FILE, PerformanceMetrics)
    if 'rma_df' not in st.session_state:
        st.session_state.rma_df = None
    if "sync_status" not in st.session_state:
        st.session_state.sync_status = {
            "sync_phase": "Idle",
            "sync_detail": format_recent_sync_detail(),
            "is_busy": False,
        }
    if "is_busy" not in st.session_state:
        st.session_state.is_busy = False
    if "last_rma_update_time" not in st.session_state:
        st.session_state.last_rma_update_time = None
    if "auto_refresh_enabled" not in st.session_state:
        st.session_state.auto_refresh_enabled = False
    if "refresh_interval" not in st.session_state:
        st.session_state.refresh_interval = 5
    if "max_workers_config" not in st.session_state:
        st.session_state.max_workers_config = 16 # Default to the faster setting

    # Top header with blue-red gradient and sparkles
    st.markdown(
        """
        <div class="main-header" style="margin-bottom: 0;">
            <h1>LEVI'S RETURNGO OPS DASHBOARD</h1>
        </div>
        """,
        unsafe_allow_html=True
    )
    
    page_access_time = datetime.now(timezone.utc)
    st.session_state["last_page_access_time"] = page_access_time

    # Connection status bar
    st.markdown(
        f"""
        <div class="connection-status" style="margin-top: 0;">
            🟢 Connected to store: <strong>{STORE_URL}</strong> | Accessed: <strong>{format_date(page_access_time, "%Y-%m-%d %H:%M:%S")}</strong>
        </div>
        """,
        unsafe_allow_html=True
    )

    sync_status = st.session_state.get("sync_status", {})
    is_busy = st.session_state.get("is_busy", False)
    phase_text = sync_status.get("sync_phase", "Idle")
    detail_text = sync_status.get("sync_detail", "")
    busy_icon = "🟡" if is_busy else "🟢"
    st.markdown(
        f"""
        <div class="sync-time-bar">
            {busy_icon} <strong>Sync phase:</strong> {phase_text}<br/>
            <span>{detail_text or "No active work"}</span>
        </div>
        """,
        unsafe_allow_html=True
    )

    if is_busy:
        st.markdown(
            f"""
            <div class="processing-banner">⏳ Processing… {phase_text} — {detail_text or 'Working...'}</div>
            <div class="busy-overlay-main"></div>
            <div class="busy-overlay-sidebar"></div>
            """,
            unsafe_allow_html=True,
        )

    # Sidebar
    with st.sidebar:
        st.markdown("<div class='api-panel'>", unsafe_allow_html=True)
        st.markdown("### 🔌 API Details")
        
        # API Settings
        st.markdown("<div class='api-setting'>", unsafe_allow_html=True)
        st.markdown("<div class='api-setting-label'>Store URL</div>", unsafe_allow_html=True)
        st.markdown(f"<div class='api-setting-value'>{STORE_URL}</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        
        st.markdown("<div class='api-setting'>", unsafe_allow_html=True)
        st.markdown("<div class='api-setting-label'>API Key Status</div>", unsafe_allow_html=True)
        api_status = "🟢 Active" if MY_API_KEY else "🔴 Missing"
        st.markdown(f"<div class='api-setting-value'>{api_status}</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        
        st.markdown("<div class='api-setting'>", unsafe_allow_html=True)
        st.markdown("<div class='api-setting-label'>Rate Limit (RPS)</div>", unsafe_allow_html=True)
        st.markdown(f"<div class='api-setting-value'>{RG_RPS}</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        
        st.markdown("<div class='api-setting'>", unsafe_allow_html=True)
        st.markdown("<div class='api-setting-label'>Cache TTL</div>", unsafe_allow_html=True)
        st.markdown(f"<div class='api-setting-value'>{CACHE_EXPIRY_HOURS}h</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        
        st.markdown("<div class='api-setting'>", unsafe_allow_html=True)
        st.markdown("<div class='api-setting-label'>Max Workers</div>", unsafe_allow_html=True)
        st.markdown(f"<div class='api-setting-value'>{MAX_WORKERS}</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
        
        st.markdown("<div class='api-setting'>", unsafe_allow_html=True)
        st.markdown("<div class='api-setting-label'>Concurrency Control</div>", unsafe_allow_html=True)
        st.number_input(
            "Max Workers", min_value=1, max_value=32, value=st.session_state.get("max_workers_config", 16), step=1,
            key="max_workers_config", help="Number of parallel threads for fetching data. Higher is faster but risks rate-limiting. Recommended: 4-16.",
            label_visibility="collapsed"
        )
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown("</div>", unsafe_allow_html=True)
        
        st.markdown("---")

        # Auto-refresh controls
        st.subheader("Auto-Refresh")
        auto_refresh_enabled = st.toggle("Enable auto-refresh", key="auto_refresh_enabled", help="Automatically syncs for new updates at a set interval.")
        refresh_interval = st.number_input(
            "Interval (minutes)", 
            min_value=1, 
            max_value=60, 
            value=st.session_state.get("refresh_interval", 5), 
            step=1, 
            key="refresh_interval",
            disabled=not auto_refresh_enabled
        )
        
        # Hidden button for the JS to click
        st.markdown('<div id="auto-refresh-trigger" style="display: none;">', unsafe_allow_html=True)
        st.button("Internal Sync Trigger", on_click=perform_incremental_sync, key="auto_refresh_button")
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown("---")

        # Cache & Sync controls
        st.subheader("Cache & Sync")
        if st.button("🔄 Clear Cache & Full Refresh", width='stretch', help="Clears all local data and fetches the latest from the API.", key="btn_clear_cache", disabled=is_busy):
            st.session_state.is_busy = True
            update_sync_status("Cache clear/full refresh", "Clearing cache and preparing full refresh...", is_busy=True)
            try:
                with st.spinner("Clearing cache and refreshing data..."):
                    st.cache_data.clear()
                    st.session_state.rma_df = None
                    st.session_state.pn_sync_prefetched_inbounds = None
                    st.session_state.pn_sync_prefetched_inbounds_range = None
                    append_ops_log("Cache cleared. Fetching fresh data.")
                st.success("Cache cleared! Data will refresh.")
            finally:
                st.session_state.is_busy = False
                update_sync_status("Idle", format_recent_sync_detail(), is_busy=False)
            st.rerun()

        if st.button("Sync Pending", width='stretch', help="Fetches the latest data for RMAs currently in 'Pending' status.", key="btn_sync_pending", disabled=is_busy):
            st.session_state.is_busy = True
            update_sync_status("Sync pending", "Preparing pending sync...", is_busy=True)
            try:
                with st.spinner("Syncing pending RMAs..."):
                    st.cache_data.clear()
                    st.session_state.rma_df = None
                    st.session_state.pn_sync_prefetched_inbounds = None
                    st.session_state.pn_sync_prefetched_inbounds_range = None
            finally:
                st.session_state.is_busy = False
                update_sync_status("Idle", format_recent_sync_detail(), is_busy=False)
            st.rerun()
        
        if st.button("Sync Updates", width='stretch', help="Fetches only the RMAs that have been updated since the last sync.", key="btn_sync_updates", disabled=is_busy):
            st.session_state.is_busy = True
            update_sync_status("Sync updates", "Preparing incremental update sync...", is_busy=True)
            try:
                with st.spinner("Syncing RMA updates..."):
                    # This will trigger an incremental sync in fetch_and_cache_data
                    st.cache_data.clear() # For simplicity, clearing cache forces a check. A more advanced version would pass a flag.
                    st.session_state.rma_df = None
                    st.session_state.pn_sync_prefetched_inbounds = None
                    st.session_state.pn_sync_prefetched_inbounds_range = None
            finally:
                st.session_state.is_busy = False
                update_sync_status("Idle", format_recent_sync_detail(), is_busy=False)
            st.rerun()

        if st.button("🚚 Fetch latest courier status", width='stretch', help="Forces a re-scrape of courier tracking statuses for all 'Approved' and 'Received' RMAs.", disabled=is_busy):
            if st.session_state.rma_df is not None and not st.session_state.rma_df.empty:
                st.session_state.is_busy = True
                update_sync_status("Courier re-scrape", "Refreshing courier statuses...", is_busy=True)
                try:
                    with st.spinner("Re-scraping all courier statuses..."):
                        # This new function does the work without calling ReturnGo
                        updated_df = force_courier_status_refresh(st.session_state.rma_df)
                        st.session_state.rma_df = updated_df
                    append_ops_log("Courier status refresh complete.")
                finally:
                    st.session_state.is_busy = False
                    update_sync_status("Idle", format_recent_sync_detail(), is_busy=False)
                st.rerun()
            else:
                st.warning("No data loaded to refresh. Please do a full refresh first.")

        st.markdown("---")

        st.subheader("↩ Tracking Updater")
        selected_tracking_store_name = st.selectbox(
            "Target Store",
            [store["name"] for store in TRACKING_UPDATE_STORES],
            key="tracking_update_store_name",
            disabled=is_busy,
        )
        selected_tracking_store_url = next(
            store["url"] for store in TRACKING_UPDATE_STORES if store["name"] == selected_tracking_store_name
        )
        st.caption(f"Targeting: `{selected_tracking_store_url}`")
        tracking_update_api_key = st.text_input(
            "API Key Override",
            type="password",
            value="",
            placeholder="Uses configured Levi's key if blank",
            key="tracking_update_api_key_override",
            disabled=is_busy,
        )
        tracking_update_rma_id = st.text_input(
            "RMA ID",
            placeholder="e.g. 9146216",
            key="tracking_update_rma_id",
            disabled=is_busy,
        )
        tracking_update_number = st.text_input(
            "New Tracking Number",
            placeholder="e.g. OPT-300999299",
            key="tracking_update_number",
            disabled=is_busy,
        )
        if st.button("Run Update", key="tracking_update_run", width='stretch', disabled=is_busy):
            if not tracking_update_rma_id or not tracking_update_number:
                st.warning("Please provide both RMA ID and Tracking Number.")
            else:
                selected_api_key = tracking_update_api_key.strip() or MY_API_KEY
                if selected_api_key:
                    success, status = validate_api_key(selected_api_key, selected_tracking_store_url)
                    if success:
                        run_update_sequence(
                            tracking_update_rma_id,
                            tracking_update_number,
                            store_url=selected_tracking_store_url,
                            api_key=selected_api_key,
                        )
                    elif status == 403:
                        st.error(f"Access Denied (403): Key lacks permissions for {selected_tracking_store_name}.")
                    elif status == 401:
                        st.error("Invalid API Key (401): Check your credentials.")
                    else:
                        st.error(f"Connection failed: {status}")
                else:
                    st.error("API Key is required.")

        # Shutdown button
        if st.button("Shutdown", key="shutdown_btn", help="Disconnects the session and stops processing.", width='stretch', type="primary", disabled=is_busy):
            st.session_state.disconnected = True
            st.rerun()
        st.markdown("---")
        
        # Performance metrics in one line
        perf_metrics = st.session_state.performance_metrics
        avg_resp = f"{perf_metrics.avg_response_time:.2f}s" if perf_metrics.avg_response_time else "N/A"
        last_sync = f"{perf_metrics.last_sync_duration:.2f}s" if perf_metrics.last_sync_duration else "N/A"
        cache_rate = f"{perf_metrics.cache_hit_rate:.1f}%" if perf_metrics.cache_hit_rate else "N/A"
        api_calls = len(perf_metrics.api_call_times)
        
        st.markdown(
            f"""
            <div class='perf-metrics'>
                <div class='perf-metric'>
                    <div class='value'>{avg_resp}</div>
                    <div class='label'>Avg Response</div>
                </div>
                <div class='perf-metric'>
                    <div class='value'>{last_sync}</div>
                    <div class='label'>Last Sync</div>
                </div>
                <div class='perf-metric'>
                    <div class='value'>{cache_rate}</div>
                    <div class='label'>Cache Hit</div>
                </div>
                <div class='perf-metric'>
                    <div class='value'>{api_calls}</div>
                    <div class='label'>API Calls</div>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
        
        st.markdown("---")
        st.markdown("---")
        
        # Activity log in terminal-style box
        st.subheader("📋 Activity Log")
        st.markdown("<div class='activity-log' style='background: var(--bg2);'>", unsafe_allow_html=True)
        if st.session_state.ops_log:
            log_text = "\n".join(st.session_state.ops_log[-20:])
            st.markdown(f"<pre style='margin: 0; white-space: pre-wrap;'>{html_lib.escape(log_text)}</pre>", unsafe_allow_html=True)
        else:
            st.markdown("<pre style='margin: 0;'>No activity logged yet.</pre>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # Main content area
    if st.session_state.rma_df is None:
        st.session_state.is_busy = True
        update_sync_status("Initial load", "Loading initial dashboard data...", is_busy=True)
        try:
            st.session_state.rma_df = fetch_and_cache_data()
        finally:
            st.session_state.is_busy = False
            update_sync_status("Idle", format_recent_sync_detail(), is_busy=False)
    
    df_raw = st.session_state.rma_df

    df_enriched = enrich_rma_dataframe(df_raw)
    update_sync_status("Sync complete", "Data ready for rendering", is_busy=False)
    counts = compute_counts(df_enriched)

    # REQUESTED TIMELINE GRAPH
    st.markdown("---")
    render_interactive_timeline(df_enriched)

    # RMA Command Center
    st.markdown("---")
    st.markdown("### 📊 RMA Command Center")

    # RMA Details section
    st.markdown("#### RMA Details")
    
    # --- NEW: RMA Activity Log ---
    st.markdown("### 📜 RMA Activity Log")
    
    def create_activity_log_df(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame()
        
        all_events = []
        for _, row in df.iterrows():
            rma_id = row.get("rma_id")
            order_name = row.get("order_name", "")
            events = safe_get(row.get("json_data", {}), "rmaSummary.events", [])
            for event in events:
                event_date = safe_parse_date_iso(event.get("eventDate"))
                if event_date:
                    all_events.append({
                        "timestamp": event_date,
                        "RMA ID": rma_id,
                        "Order": order_name,
                        "Event": event.get("eventName", "Unknown").replace("_", " ").title(),
                        "Source": event.get("triggeredVia", "-"),
                    })
    
        if not all_events:
            return pd.DataFrame()
            
        activity_df = pd.DataFrame(all_events)
        activity_df = activity_df.sort_values(by="timestamp", ascending=False)
        activity_df["Timestamp"] = activity_df["timestamp"].apply(lambda dt: format_date(dt, "%Y-%m-%d %H:%M"))
        activity_df["RMA ID"] = activity_df["RMA ID"].apply(lambda x: f"https://app.returngo.ai/dashboard/returns?filter_status=open&rmaid={x}" if x else "-")
        return activity_df[["Timestamp", "RMA ID", "Order", "Event", "Source"]]

    activity_df = create_activity_log_df(df_enriched)

    if not activity_df.empty:
        with st.container(height=350): # Makes the container scrollable for more than ~10 entries
            st.dataframe(
                activity_df.head(100), # Limit to most recent 100 events
                hide_index=True,
                use_container_width=True,
                column_config={
                    "RMA ID": st.column_config.LinkColumn(
                        "RMA ID", display_text=r"rmaid=([^&]*)"
                    ) 
                }
            )
    else:
        st.info("No activity to display. Data may still be loading.")

    # Create metric cards in grid layout
    metric_cols = st.columns(4)
    
    render_metric_card(metric_cols[0], "Total Open", "Total Open", "All", "Shows all open RMAs.", card_accent="#57a6ff", count_color="#b9dbff")
    render_metric_card(metric_cols[1], "Pending", "Pending", "Pending Requests", "Filters for RMAs with 'Pending' status.", card_accent="#f0b429", count_color="#ffd88a")
    render_metric_card(metric_cols[2], "In Transit", "In Transit", "In Transit", "Filters for RMAs currently in transit.", card_accent="#22d3ee", count_color="#8ff3ff")
    render_metric_card(metric_cols[3], "Received", "Received", "Received", "Filters for RMAs marked as 'Received'.", card_accent="#34d399", count_color="#a7f3d0")

    # Additional metric cards
    st.markdown("---")
    
    metric_cols2 = st.columns(4)

    render_metric_card(metric_cols2[0], "Ready to close: Refund to credit", "Ready to close: Refund to credit", "Ready to close: Refund to credit", "Refund-to-credit RMAs actioned 30+ days ago (neon blue rows).", card_accent="#60a5fa", count_color="#bfdbfe")
    render_metric_card(metric_cols2[1], "Flagged", "Flagged", "Flagged", "Filters for RMAs with a 'flag' comment.", card_accent="#e879f9", count_color="#f5d0fe")
    render_metric_card(metric_cols2[2], "RG APPROVED > SUBMITTED TO COURIER", "Submitted", "RG APPROVED > SUBMITTED TO COURIER", "Approved RMAs with 'Submitted to Courier' status.", card_accent="#38bdf8", count_color="#bae6fd")
    render_metric_card(metric_cols2[3], "Approved > Delivered", "Delivered", "Approved > Delivered", "Approved RMAs that have been delivered.", card_accent="#22c55e", count_color="#bbf7d0")

    # Third row
    metric_cols3 = st.columns(4)
    
    render_metric_card(metric_cols3[0], "Courier Cancelled", "Courier Cancelled", "Courier Cancelled", "Shipments cancelled by the courier.", card_accent="#f97316", count_color="#fdba74")
    render_metric_card(metric_cols3[1], "No Tracking", "No Tracking", "No Tracking", "Approved/Received RMAs missing a tracking number.", card_accent="#f59e0b", count_color="#fde68a")
    render_metric_card(metric_cols3[2], "Resolution Actioned", "Resolution Actioned", "Resolution Actioned", "RMAs where a refund or exchange has been processed.", card_accent="#14b8a6", count_color="#99f6e4")
    render_metric_card(metric_cols3[3], "No Resolution Actioned", "No Resolution Actioned", "No Resolution Actioned", "Received RMAs awaiting a resolution action.", card_accent="#ef4444", count_color="#fecaca")

    # Resolution Type Chart
    st.markdown("---")
    st.markdown("### 📈 Resolution Analysis")
    if not df_enriched.empty and "resolution_type" in df_enriched.columns:
        # Handle comma-separated resolution types by splitting and exploding
        resolution_counts = df_enriched['resolution_type'].str.split(', ').explode().str.strip()
        resolution_counts = resolution_counts[resolution_counts != '-'].value_counts().reset_index()
        resolution_counts.columns = ['Resolution Type', 'Count']

        if not resolution_counts.empty:
            num_resolutions = len(resolution_counts)
            chart_height = max(200, num_resolutions * 28)

            chart = alt.Chart(resolution_counts).mark_bar(color="#57a6ff").encode(
                x=alt.X('Count:Q', title='Number of RMAs'),
                y=alt.Y('Resolution Type:N', title='Resolution Type', sort='-x'), # Sort descending
                color=alt.Color('Resolution Type:N', legend=None, scale=alt.Scale(scheme='tableau20')),
                tooltip=[
                    alt.Tooltip('Resolution Type:N', title='Resolution'),
                    alt.Tooltip('Count:Q', title='Count')
                ]
            ).properties(
                title="Breakdown of RMA Resolution Types",
                height=chart_height
            ).interactive()
            st.altair_chart(chart, use_container_width=True)
        else:
            st.info("No resolution data available to display.")

    st.markdown("---")
    st.markdown("<div style='font-size: 0.8rem; color: var(--dim-text); margin-bottom: 5px;'>Search by RMA, Order, Tracking, Client ID, or Customer. Paste a comma/newline separated list for multi-search.</div>", unsafe_allow_html=True)
    sc1, sc3 = st.columns([8, 2], vertical_alignment="center")
    with sc1:
        st.text_input(
            "Search",
            placeholder="🔍 Search by RMA, Order, Tracking, Client ID, or Customer...",
            label_visibility="collapsed",
            key="search_query_input",
            disabled=is_busy,
        )
    with sc3:
        st.button("📋 Clear All Filters", on_click=clear_all_filters, width='stretch', type="secondary", disabled=is_busy)

    # Additional filters expander
    with st.expander("Additional filters", expanded=False):
        c1, c2, c3, c4, c5 = st.columns([2, 2, 2, 2, 2], vertical_alignment="center")
        
        with c1:
            st.multiselect("Status", options=ACTIVE_RG_STATUSES, key="status_multi", disabled=is_busy)
        
        with c2:
            res_opts = []
            if not df_enriched.empty and "resolution_type" in df_enriched.columns:
                res_opts = sorted([
                    x for x in df_enriched["resolution_type"].dropna().unique().tolist() 
                    if x and x != "-"
                ])
            st.multiselect("Resolution type", options=res_opts, key="res_multi", disabled=is_busy)
        
        with c3:
            st.multiselect("Resolution actioned", options=["Yes", "No"], key="actioned_multi", disabled=is_busy)
        
        with c4:
            st.multiselect("Tracking Status", options=COURIER_STATUS_OPTIONS, key="tracking_multi", disabled=is_busy)
        
        with c5:
            if st.button("🧼 Clear filters", width='stretch', type="secondary", disabled=is_busy):
                clear_all_filters()
                st.rerun()

    # Data table
    st.markdown("---")
    st.subheader("RMA Data Table")
    
    # Show active filter
    if st.session_state.active_filters:
        st.info(f"Active Filters: **{', '.join(st.session_state.active_filters)}**")
        if st.button("Clear Filter", disabled=is_busy):
            clear_all_filters()
            st.rerun()

    # Apply both main filter and additional filters
    df_filtered = apply_filters(df_enriched)
    df_filtered = apply_additional_filters(df_filtered)
    
    # Display columns - UPDATED WITH NEW COLUMNS
    display_cols = [
        "No",
        "RMA ID",
        "Order",
        "Customer Name",
        "RMA Status",
        "Requested date",
        "Approved date",
        "Received date",
        "Done date",
        "Client ID",
        "Inbound Status",
        "Inbound update Date",
        "Tracking Number",
        "Tracking Status",
        "Days since requested", # This will be an integer
        "Last RMA Update",
        "resolutionType",
        "Days since credit",      # MOVED & will be an integer
        "Resolution actioned",
        "Is Tracking Updated",
        "failures",
    ]

    if not df_filtered.empty:
        display_df = df_filtered.copy()
        display_df.insert(0, "No", range(1, len(display_df) + 1))
        
        # Rename columns for display - UPDATED WITH NEW COLUMNS
        display_df = display_df.rename(columns={
            "rma_id": "RMA ID",
            "order_name": "Order",
            "customer_name": "Customer Name",
            "client_id": "Client ID",
            "inbound_status": "Inbound Status",
            "inbound_update_date": "Inbound update Date",
            "status": "RMA Status",
            "tracking_number": "Tracking Number",
            "tracking_status": "Tracking Status",
            "requested_date": "Requested date",
            "approved_date": "Approved date",
            "received_date": "Received date",
            "done_date": "Done date",
            "days_since_requested": "Days since requested",
            "days_since_credit": "Days since credit",      # MOVED
            "last_rma_update": "Last RMA Update",
            "resolution_type": "resolutionType",
            "is_tracking_updated": "Is Tracking Updated",
            "resolution_actioned": "Resolution actioned",
        })
        
        # Ensure day counters are whole numbers and sort ascending (0 days at top)
        if "Days since requested" in display_df:
            display_df["Days since requested"] = pd.to_numeric(display_df["Days since requested"], errors="coerce").round().astype("Int64")
        if "Days since credit" in display_df:
            display_df["Days since credit"] = pd.to_numeric(display_df["Days since credit"], errors="coerce").round().astype("Int64")
        display_df = display_df.sort_values(by=["Days since requested", "No"], ascending=[True, True], na_position="last").reset_index(drop=True)
        display_df["No"] = range(1, len(display_df) + 1)

        # Format dates - ADDED "Done date"
        for col in ["Requested date", "Approved date", "Received date", "Done date"]:
            if col in display_df.columns:
                display_df[col] = display_df[col].apply(lambda x: format_date(x) if pd.notna(x) else "-")
        
        # Add placeholder columns if missing
        if "Is Tracking Updated" not in display_df.columns:
            display_df["Is Tracking Updated"] = "-"
        
        # Create RMA ID links
        display_df["RMA ID"] = display_df["RMA ID"].apply(
            lambda x: f"https://app.returngo.ai/dashboard/returns?filter_status=open&rmaid={x}" if x else "-"
        )
        
        # Create tracking links - using the new function that handles the update indicator
        display_df["Tracking Number"] = display_df["Tracking Number"].apply(create_tracking_url)
        
        render_data_table(display_df, display_cols)
    else:
        st.warning("No RMAs match the current filter.")

def render_highlighting_logic_table(df_for_styling: pd.DataFrame):
    """Renders the table explaining the row highlighting logic."""
    if df_for_styling.empty:
        return

    highlight_data = {
        "Color": ["🟠 Light Orange", "🟢 Green", "🔵 Neon Blue", "🟡 Yellow", "🔴 Red", "🟠 Orange (Cell)"],
        "Condition": [
            "`RMA Status` is `Pending`",
            "`Resolution` is `RefundToStoreCredit`, `Actioned` is `Yes`, and `Days since credited` < 30",
            "`Resolution` is `RefundToStoreCredit`, `Actioned` is `Yes`, and `Days since credited` >= 30",
            "Failure type is `NO_RESOLUTION`",
            "Failure is `COURIER_CANCELLED` or `MISSING_TRACKING`",
            "'OPT' tracking number found in `Last RMA Update` comment"
        ],
        "Count": [
            len(df_for_styling[df_for_styling['RMA Status'].astype(str).str.lower() == 'pending']),
            len(df_for_styling[(df_for_styling['resolutionType'].str.contains("RefundToStoreCredit", na=False)) & (df_for_styling['Resolution actioned'] == 'Yes') & (df_for_styling['Days since credit'] < 30)]),
            len(df_for_styling[(df_for_styling['resolutionType'].str.contains("RefundToStoreCredit", na=False)) & (df_for_styling['Resolution actioned'] == 'Yes') & (df_for_styling['Days since credit'] >= 30)]),
            len(df_for_styling[df_for_styling['failures'].str.contains("NO_RESOLUTION", na=False)]),
            len(df_for_styling[df_for_styling['failures'].str.contains("COURIER_CANCELLED|MISSING_TRACKING", na=False) | (df_for_styling['Tracking Status'] == 'No tracking number')]),
            len(df_for_styling[df_for_styling['Last RMA Update'].str.contains("OPT", na=False)])
        ]
    }
    highlight_df = pd.DataFrame(highlight_data)
    st.dataframe(highlight_df[highlight_df['Count'] > 0], hide_index=True, use_container_width=False)


def render_tracking_reference_update_buttons(display_df: pd.DataFrame):
    """Render per-row quick update buttons for populated tracking numbers."""
    if display_df.empty or "Tracking Number" not in display_df.columns:
        return

    rows_with_tracking = []
    for row_index, row in display_df.iterrows():
        tracking_ref = extract_tracking_reference_from_display_value(row.get("Tracking Number", ""))
        rma_id = extract_rma_id_from_display_value(row.get("RMA ID", row.get("rma_id", "")))
        if rma_id and tracking_ref:
            rows_with_tracking.append((row_index, rma_id, tracking_ref, row))

    if not rows_with_tracking:
        return

    with st.expander("🔄 Quick tracking reference updates", expanded=False):
        st.caption("Use the button next to a tracking number to open the update dialog for that RMA.")
        for row_index, rma_id, tracking_ref, row in rows_with_tracking:
            col_tracking, col_action = st.columns([5, 1])
            with col_tracking:
                st.markdown(f"`{tracking_ref}` — RMA `{rma_id}`")
            with col_action:
                button_key = f"btn_update_tracking_ref_{row_index}_{rma_id}"
                if st.button(
                    "Update",
                    key=button_key,
                    help=f"Update tracking reference for RMA {rma_id}",
                    disabled=st.session_state.get("is_busy", False),
                    use_container_width=True,
                ):
                    show_update_tracking_reference_dialog(
                        rma_id=rma_id,
                        current_tracking=tracking_ref,
                        row_data=row,
                    )


def render_data_table(display_df: pd.DataFrame, display_cols: List[str]):
    """Renders the main data table with all interactions."""
    
    # UPDATED base_column_config with new columns
    display_cols = [
        "No",
        "RMA ID",
        "Order",
        "Customer Name",
        "RMA Status",
        "Requested date",
        "Approved date",
        "Received date",
        "Done date",
        "Client ID",
        "Inbound Status",
        "Inbound update Date",
        "Tracking Number",
        "Tracking Status",
        "Days since requested",
        "Last RMA Update",
        "resolutionType",
        "Days since credit",
        "Resolution actioned",
        "Is Tracking Updated",
        "failures",
    ]
    base_column_config = {
        "No": st.column_config.TextColumn("No"),
        "RMA ID": st.column_config.LinkColumn(
            "RMA ID",
            display_text=r"rmaid=([^&]*)",
        ),
        "Order": st.column_config.TextColumn("Order"),
        "Customer Name": st.column_config.TextColumn("Customer Name"),
        "Client ID": st.column_config.TextColumn("Client ID"),
        "Inbound Status": st.column_config.TextColumn("Inbound Status"),
        "Inbound update Date": st.column_config.TextColumn("Inbound update Date"),
        "RMA Status": st.column_config.TextColumn("RMA Status"),
        "Tracking Number": st.column_config.LinkColumn("Tracking Number", 
            display_text=r"(OPT-[^↻\s]*)",  # Updated regex to handle update indicator
            help="Click to track on The Courier Guy portal. ↻ indicates tracking was updated"),
        "Tracking Status": st.column_config.TextColumn("Tracking Status"),
        "Requested date": st.column_config.TextColumn("Requested date"),
        "Approved date": st.column_config.TextColumn("Approved date"),
        "Received date": st.column_config.TextColumn("Received date"),
        "Done date": st.column_config.TextColumn("Done date"),
        "Days since requested": st.column_config.NumberColumn("Days since requested", 
            help="Number of days since the RMA was requested.",
            format="%d"),
        "Days since credit": st.column_config.NumberColumn("Days since credit", 
            help="Number of days since credit/refund was issued.",
            format="%d"),
        "Last RMA Update": st.column_config.TextColumn("Last RMA Update",
            help="Most recent comment from RMA timeline in format: dd-mm-yy hh:mm - [comment]"),  # NEW COLUMN
        "resolutionType": st.column_config.TextColumn("resolutionType"),
        "Resolution actioned": st.column_config.TextColumn("Resolution actioned"),
        "Is Tracking Updated": st.column_config.TextColumn("Is Tracking Updated"),
        "failures": st.column_config.TextColumn("failures"),
    }

    table_df = display_df[display_cols].copy()

    def _autosize_width(column: str, data: pd.DataFrame) -> Literal["small", "medium", "large"]:
        if column not in data.columns or data.empty:
            return "medium"
        max_len = int(data[column].astype(str).map(len).max())
        if max_len <= 8:
            return "small"
        if max_len <= 20:
            return "medium"
        return "large"

    link_column_configs = {
        "RMA ID": {"display_text": r"rmaid=([^&]*)"},
        "Tracking Number": {"display_text": r"(OPT-[^↻\s]*)"},  # Updated to handle update indicator
    }

    if st.session_state.get("table_autosize"):
        column_config = dict(base_column_config)
        for key in display_cols:
            width = _autosize_width(key, table_df)
            if key == "RMA ID":
                column_config[key] = st.column_config.LinkColumn("RMA ID", display_text=r"rmaid=([^&]*)", width=width)
            elif key == "Tracking Number":
                column_config[key] = st.column_config.LinkColumn(
                    "Tracking Number",
                    display_text=r"(OPT-[^↻\s]*)",
                    help="Click to track on The Courier Guy portal. ↻ indicates tracking was updated",
                    width=width,
                )
            elif key == "Days since requested":
                column_config[key] = st.column_config.NumberColumn(
                    "Days since requested",
                    help="Number of days since the RMA was requested.",
                    format="%d",
                    width=width,
                )
            elif key == "Days since credit":
                column_config[key] = st.column_config.NumberColumn(
                    "Days since credit",
                    help="Number of days since credit/refund was issued.",
                    format="%d",
                    width=width,
                )
            else:
                column_config[key] = st.column_config.TextColumn(key, width=width)
    else:
        column_config = base_column_config

    total_rows = len(table_df)
    
    # Rows count
    st.markdown(
        f"<div class='rows-count'>Rows in table: <span class='value'>{total_rows}</span></div>",
        unsafe_allow_html=True,
    )
    
    # CSV and Autosize buttons
    st.markdown("<div class='table-actions-left'>", unsafe_allow_html=True)
    col1, col2, col3 = st.columns([1, 1, 6])
    with col1:
        csv_payload = table_df.to_csv(index=False)
        st.download_button(
            label="⬇️ CSV",
            data=csv_payload,
            file_name=f"returngo_table_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime="text/csv",
            key="download_table_csv",
            disabled=st.session_state.get("is_busy", False),
        )
    with col2:
        if st.button("Autosize", key="autosize_btn", disabled=st.session_state.get("is_busy", False)):
            st.session_state.table_autosize = not st.session_state.get("table_autosize", False)
            st.rerun()
    st.markdown("</div>", unsafe_allow_html=True)

    # Prepare TSV for copy with robust string conversion to avoid TypeErrors
    render_tracking_reference_update_buttons(display_df)

    def dataframe_styler(df: pd.DataFrame):
        """Applies conditional styling to the dataframe."""
        style_df = pd.DataFrame('', index=df.index, columns=df.columns)
        
        # Green highlight for RefundToStoreCredit, actioned, credited < 30 days
        green_mask = (df['resolutionType'].str.contains("RefundToStoreCredit", na=False)) & \
                     (df['Resolution actioned'] == 'Yes') & \
                     (df['Days since credit'] < 30)
        style_df.loc[green_mask, :] = 'background-color: rgba(74, 222, 128, 0.4); border: 1px solid rgba(4, 120, 87, 0.6);' # green with opacity and border

        # Neon blue highlight for RefundToStoreCredit, actioned, credited >= 30 days
        blue_mask = (df['resolutionType'].str.contains("RefundToStoreCredit", na=False)) & \
                    (df['Resolution actioned'] == 'Yes') & \
                    (df['Days since credit'] >= 30)
        style_df.loc[blue_mask, :] = 'background-color: rgba(96, 165, 250, 0.4); border: 2px solid rgba(37, 99, 235, 0.6);' # blue with opacity and stronger border

        # Orange highlight for Pending rows
        pending_mask = df['RMA Status'].astype(str).str.lower() == 'pending'
        style_df.loc[pending_mask, :] = 'background-color: rgba(255, 224, 178, 0.8); border: 1px solid rgba(168, 85, 0, 0.6);'

        # Orange highlight for 'Is Tracking updated' column when "OPT" is in timeline comments
        orange_mask = df['Last RMA Update'].str.contains("OPT", na=False)
        style_df.loc[orange_mask, 'Is Tracking Updated'] = 'background-color: rgba(251, 146, 60, 0.5); border-left: 3px solid rgba(249,115,22,0.8);'

        # Yellow highlight for "NO_RESOLUTION" failures
        no_resolution_mask = df['failures'].str.contains("NO_RESOLUTION", na=False)
        style_df.loc[no_resolution_mask, :] = 'background-color: rgba(253, 224, 71, 0.4); border: 1px solid rgba(191, 90, 0, 0.5);' # yellow with opacity

        # Red highlight for other failures (will override yellow if both are present, e.g., "COURIER_CANCELLED,NO_RESOLUTION")
        other_failures_mask = df['failures'].str.contains("COURIER_CANCELLED|MISSING_TRACKING", na=False) | (df['Tracking Status'] == 'No tracking number')
        style_df.loc[other_failures_mask, :] = 'background-color: rgba(220, 38, 38, 0.35); color: #fee2e2; border: 2px solid rgba(185, 28, 28, 0.6);'

        res_actioned_mask = (df['Resolution actioned'] == 'Yes') & (df['RMA Status'] == 'Approved')
        style_df.loc[res_actioned_mask, 'Resolution actioned'] = 'background-color: rgba(253, 224, 71, 0.4);'

        return style_df

    # Apply styling
    # We need the original data for conditions, so we style `display_df` and then select columns.
    # Create a copy for styling and drop the complex 'json_data' column to prevent Arrow errors.
    df_for_styling = display_df.copy()
    if 'json_data' in df_for_styling.columns:
        df_for_styling = df_for_styling.drop(columns=['json_data'])
        
    styled_table = df_for_styling.style.apply(dataframe_styler, axis=None)
    
    st.markdown("##### Row Highlighting Logic")
    render_highlighting_logic_table(df_for_styling)
    # The dataframe passed to st.dataframe should have the columns we want to show
    # This also fixes the ArrowInvalid error by removing the complex 'json_data' column
    sel_event = st.dataframe(
        styled_table,
        height=700,
        hide_index=True,
        column_config=column_config,
        on_select="rerun",
        selection_mode="multi-row",
        column_order=display_cols, # Ensure correct column order
        key="rma_table",
    )

    sel_rows = sel_event.get("selection", {}).get("rows", []) if isinstance(sel_event, dict) else []
    if sel_rows:
        selected_indices = [int(i) for i in sel_rows]
        
        # Filter indices to prevent out-of-bounds error after re-run/re-filter
        valid_indices = [i for i in selected_indices if i < len(display_df)]

        if valid_indices:
            selected_rows = display_df.iloc[valid_indices]
            selected_rma_ids = [str(val).split("rmaid=")[-1] for val in selected_rows["RMA ID"].tolist()]

            st.markdown("---")
            st.markdown(f"**Selected RMAs ({len(selected_rma_ids)}):** {', '.join(selected_rma_ids)}")

            if st.button("🔄 Fetch update for selected RMA(s)", key="btn_fetch_selected_rmas", width='stretch'):
                success_count = 0
                with st.spinner("Fetching latest data for selected RMAs..."):
                    for rma_id in selected_rma_ids:
                        if update_single_rma(rma_id):
                            success_count += 1
                if success_count:
                    st.success(f"Updated {success_count}/{len(selected_rma_ids)} RMA(s).")
                    st.rerun()
                else:
                    st.warning("No selected RMAs were updated.")

            if len(valid_indices) == 1 and not st.session_state.pop("suppress_row_dialog", False): # type: ignore
                show_rma_actions_dialog(display_df.iloc[valid_indices[0]])

    try:
        remaining = RATE_LIMIT_INFO.get("remaining")
        limit = RATE_LIMIT_INFO.get("limit")
        if isinstance(remaining, (int, str)) and isinstance(limit, (int, str)): # type: ignore
            remain_int = int(remaining)
            limit_int = int(limit)
            if remain_int < limit_int * 0.2:
                st.warning(f"⚠️ API quota low: {remain_int}/{limit_int} requests remaining")
    except (ValueError, TypeError):
        pass
    
    last_sync_time = st.session_state.get("last_sync_time")
    last_sync_display = (
        format_date(last_sync_time, "%Y-%m-%d %H:%M:%S") + f" {DISPLAY_TZ_NAME}"
        if last_sync_time
        else "Never"
    )
    st.markdown(
        f"<div class='sync-time-bar'>Last sync: {last_sync_display}</div>",
        unsafe_allow_html=True,
    )

    # --- Less-disruptive auto-refresh client-side trigger ---
    if st.session_state.get("auto_refresh_enabled") and not st.session_state.get("is_busy"):
        interval_seconds = st.session_state.get("refresh_interval", 5) * 60
        # Add a bit of jitter to avoid multiple clients refreshing at the exact same time
        jitter = random.uniform(-5, 5)
        refresh_interval_ms = (interval_seconds + jitter) * 1000
        
        components.html(
            f"""
            <script>
                const interval = {refresh_interval_ms};
                console.log(`Setting non-disruptive auto-refresh timer for ${'{'}interval{'}'}ms.`);

                setTimeout(() => {{
                    const triggerDiv = window.parent.document.getElementById('auto-refresh-trigger');
                    if (triggerDiv) {{
                        const button = triggerDiv.querySelector('button');
                        if (button) {{
                            console.log('Auto-refresh: Clicking internal sync trigger button.');
                            button.click();
                        }}
                    }}
                }}, interval);
            </script>
            """,
            height=0,
        )


if __name__ == "__main__":
    main()
    
