import json
from datetime import datetime, timezone

from pymongo import MongoClient, ASCENDING, ReturnDocument

from config import ACADEMIC_YEAR_CODE, MONGODB_URI, MONGODB_DB


def _arr(values) -> list | None:
    """Return a list for storage, or None when empty (mirrors the old NULL)."""
    return values if values else None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_db():
    """Open a connection and return the database handle."""
    client = MongoClient(MONGODB_URI)
    return client[MONGODB_DB]


def create_schema(db) -> None:
    """Create the indexes the app relies on (collections are created lazily)."""
    db.majors.create_index("report_key", unique=True)
    db.articulations.create_index("major_id")
    db.cerritos_catalog.create_index("course_identifier_parent_id", unique=True)
    db.cerritos_catalog.create_index("course_key")


def _next_id(db, name: str) -> int:
    """Atomic auto-increment, so majors keep stable integer ids across re-scrapes."""
    doc = db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["seq"]


def upsert_major(db, name: str, key: str, university: str) -> int:
    existing = db.majors.find_one({"report_key": key}, {"_id": 1})
    if existing:
        db.majors.update_one(
            {"_id": existing["_id"]},
            {"$set": {"name": name, "university": university}},
        )
        return existing["_id"]

    major_id = _next_id(db, "majors")
    db.majors.insert_one({
        "_id": major_id,
        "name": name,
        "academic_year": ACADEMIC_YEAR_CODE,
        "report_key": key,
        "university": university,
        "scraped_at": _now(),
    })
    return major_id


def insert_articulation(db, major_id: int, art: dict) -> None:
    art_type = art.get("type", "Course")
    sending = art.get("sendingArticulation", {})
    no_reason = sending.get("noArticulationReason")
    items = sending.get("items", [])

    if art_type == "Series":
        series = art.get("series", {})
        courses = series.get("courses", [])
        first = courses[0] if courses else {}
        prefix, number, title = first.get("prefix"), first.get("courseNumber"), first.get("courseTitle")
        units, max_units = first.get("minUnits"), first.get("maxUnits")
        department = first.get("department")
        series_name = series.get("name")
    elif art_type == "Requirement":
        req = art.get("requirement", {})
        prefix, number, title = None, None, req.get("name")
        units, max_units, department, series_name = None, None, None, None
    else:  # Course
        course = art.get("course", {})
        prefix, number, title = course.get("prefix"), course.get("courseNumber"), course.get("courseTitle")
        units, max_units = course.get("minUnits"), course.get("maxUnits")
        department = course.get("department")
        series_name = None

    groups = []
    for group in items:
        courses = [
            {
                "course_identifier_parent_id": cc.get("courseIdentifierParentId"),
                "course_prefix": cc.get("prefix"),
                "course_number": cc.get("courseNumber"),
                "course_title": cc.get("courseTitle"),
                "min_units": cc.get("minUnits"),
                "max_units": cc.get("maxUnits"),
                "department": cc.get("department"),
                "position": cc.get("position", 0),
            }
            for cc in group.get("items", [])
        ]
        groups.append({
            "group_position": group.get("position", 0),
            "conjunction": group.get("courseConjunction", "And"),
            "courses": courses,
        })

    db.articulations.insert_one({
        "major_id": major_id,
        "articulation_type": art_type,
        "uci_course_prefix": prefix,
        "uci_course_number": number,
        "uci_course_title": title,
        "uci_series_name": series_name,
        "uci_min_units": units,
        "uci_max_units": max_units,
        "uci_department": department,
        "no_articulation_reason": no_reason,
        "raw_json": json.dumps(art),
        "groups": groups,
    })


def upsert_catalog(db, courses: list[dict]) -> None:
    for c in courses:
        notations = c.get("notations", [])
        former = list({
            f"{n['prefixCode']} {n['courseNumber']}".upper()
            for n in notations
            if n.get("prefixCode") and n.get("courseNumber")
        })

        areas = c.get("transferAreas", [])
        igetc   = [a["code"] for a in areas if a["areaType"] == 3]
        calgetc = [a["code"] for a in areas if a["areaType"] == 8]
        uc_areas = [a["code"] for a in areas if a["areaType"] == 2]

        prefix = c.get("prefixCode")
        course_number = c.get("courseNumber")
        course_key = f"{prefix} {course_number}".upper()

        db.cerritos_catalog.update_one(
            {"course_identifier_parent_id": c.get("courseIdentifierParentId")},
            {"$set": {
                "prefix": prefix,
                "course_number": course_number,
                "course_key": course_key,
                "course_title": c.get("courseTitle"),
                "department": c.get("departmentName"),
                "min_units": c.get("minUnits"),
                "max_units": c.get("maxUnits"),
                "is_csu_transferable": bool(c.get("isCsuTransferable", False)),
                "igetc_areas": _arr(igetc),
                "calgetc_areas": _arr(calgetc),
                "uc_transfer_areas": _arr(uc_areas),
                "former_identifiers": _arr(former),
                "academic_year": ACADEMIC_YEAR_CODE,
                "scraped_at": _now(),
            }},
            upsert=True,
        )
