"""
FanLearn Lab — 学术数据定时爬虫
Phase 5 激活时运行，目前为骨架文件

运行方式：
  pip install -r requirements.txt
  python -m crawler.scholar_sync

环境变量（.env 文件）：
  MOONSHOT_API_KEY=xxx
  DATABASE_URL=postgresql://...
"""

import asyncio
import logging
from datetime import datetime, timedelta

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---- Semantic Scholar API ----
SS_BASE = "https://api.semanticscholar.org/graph/v1"
SS_FIELDS = "title,authors,year,venue,citationCount,doi,abstract"
HEADERS = {"User-Agent": "FanLearnLab/1.0 (academic-website)"}


async def fetch_author_papers(ss_author_id: str) -> list[dict]:
    """查询 Semantic Scholar 作者的最新论文（免费API）"""
    url = f"{SS_BASE}/author/{ss_author_id}/papers"
    params = {"fields": SS_FIELDS, "limit": 50}

    async with httpx.AsyncClient(headers=HEADERS) as client:
        resp = await client.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json().get("data", [])


async def fetch_author_stats(ss_author_id: str) -> dict | None:
    """获取作者统计数据（h-index, 引用数）"""
    url = f"{SS_BASE}/author/{ss_author_id}"
    params = {"fields": "name,hIndex,citationCount"}

    async with httpx.AsyncClient(headers=HEADERS) as client:
        resp = await client.get(url, params=params, timeout=30)
        if resp.status_code != 200:
            return None
        return resp.json()


def is_recent(paper: dict, days: int = 30) -> bool:
    """判断论文是否为最近 days 天内的新论文"""
    year = paper.get("year")
    if not year:
        return False
    cutoff = datetime.now().year - 1  # 简化：只要是近两年的都爬取
    return year >= cutoff


async def submit_to_review_queue(paper: dict, source: str = "auto_crawler"):
    """提交论文到审核队列（Phase 5 接入真实 API）"""
    # Phase 5 实现：
    # async with httpx.AsyncClient() as client:
    #     resp = await client.post(
    #         "http://localhost:3000/api/publications",
    #         json={**paper, "source": source, "status": "pending_review"},
    #         headers={"Authorization": f"Bearer {INTERNAL_API_KEY}"}
    #     )
    logger.info(f"[submit] {paper.get('title', 'Unknown')} → review queue")


async def sync_member_papers(member: dict):
    """同步单个成员的论文数据"""
    ss_id = member.get("semanticScholarId")
    if not ss_id:
        logger.warning(f"[skip] {member['name']} has no Semantic Scholar ID")
        return

    logger.info(f"[sync] Fetching papers for {member['name']} ({ss_id})")

    try:
        papers = await fetch_author_papers(ss_id)
        new_count = 0

        for paper in papers:
            if is_recent(paper):
                await submit_to_review_queue(paper, source="auto_crawler")
                new_count += 1

        # 同步 h-index 和引用数
        stats = await fetch_author_stats(ss_id)
        if stats:
            logger.info(
                f"[stats] {member['name']}: h-index={stats.get('hIndex')}, "
                f"citations={stats.get('citationCount')}"
            )
            # Phase 5: 更新数据库

        logger.info(f"[done] {member['name']}: {new_count} new papers submitted")

    except Exception as e:
        logger.error(f"[error] {member['name']}: {e}")


async def daily_sync():
    """每日增量同步 —— 爬取所有成员的新论文"""
    logger.info("=== Daily Scholar Sync Started ===")

    # Phase 5 替换为从数据库读取成员列表
    # 示例成员配置
    members = [
        {"name": "范学峰", "semanticScholarId": "PLACEHOLDER_ID_1"},
        {"name": "李梦玉", "semanticScholarId": "PLACEHOLDER_ID_2"},
    ]

    for member in members:
        await sync_member_papers(member)
        await asyncio.sleep(2)  # 避免 API 限流

    logger.info("=== Daily Scholar Sync Completed ===")


async def weekly_citation_update():
    """每周全量更新：同步所有论文的引用数"""
    logger.info("=== Weekly Citation Update Started ===")
    # Phase 5 实现：批量查询 Semantic Scholar，更新引用数
    logger.info("=== Weekly Citation Update Completed ===")


# ---- 定时任务调度 ----
scheduler = AsyncIOScheduler()

# 每天凌晨2点增量同步新论文
scheduler.add_job(daily_sync, "cron", hour=2, minute=0)

# 每周日凌晨3点全量更新引用数
scheduler.add_job(weekly_citation_update, "cron", day_of_week="sun", hour=3, minute=0)


async def main():
    """启动爬虫（Phase 5 部署时取消注释）"""
    logger.info("FanLearn Lab Crawler Starting...")
    scheduler.start()

    # 首次运行立即执行一次
    await daily_sync()

    logger.info("Scheduler running. Press Ctrl+C to stop.")
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()


if __name__ == "__main__":
    # Phase 5 激活：取消注释下面这行
    # asyncio.run(main())
    logger.info("Crawler skeleton loaded. Phase 5 时取消注释 main() 调用。")
