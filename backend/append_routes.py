import os

routes_to_append = """

@router.get("/requests")
async def get_pending_requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
) -> Any:
    \"\"\"Get all pending consumption modification requests for admins.\"\"\"
    query = text(\"\"\"
        SELECT c.id, c.user_id, u.name as user_name, u.daily_target_qty as user_target_qty, 
               c.date, c.quantity as current_quantity, c.extra_qty as current_extra_qty,
               c.requested_quantity, c.requested_extra_qty, c.request_note
        FROM consumption c
        JOIN users u ON c.user_id = u.id
        WHERE c.request_status = 'PENDING'
        ORDER BY c.date ASC
    \"\"\")
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    requests = []
    for row in rows:
        req_qty = float(row.requested_quantity) if row.requested_quantity is not None else None
        req_extra = float(row.requested_extra_qty) if row.requested_extra_qty is not None else None
        
        # Determine modification type
        mod_type = "MODIFICATION"
        if req_qty is not None and req_qty == 0:
            mod_type = "CANCEL_ORDER"
        elif req_qty is not None and req_qty < float(row.current_quantity):
            mod_type = "REDUCE_ORDER"
        elif req_extra is not None and req_extra > 0:
            mod_type = "EXTRA_MILK"
            
        requests.append({
            "id": str(row.id),
            "user_id": str(row.user_id),
            "user_name": row.user_name,
            "date": str(row.date),
            "current_quantity": float(row.current_quantity),
            "requested_quantity": req_qty,
            "current_extra_qty": float(row.current_extra_qty),
            "requested_extra_qty": req_extra,
            "modification_type": mod_type,
            "request_note": row.request_note,
            "user_target_qty": float(row.user_target_qty) if row.user_target_qty else None
        })
        
    return requests


@router.post("/{consumption_id}/verify")
async def verify_request(
    consumption_id: UUID,
    approved: bool,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(deps.get_current_active_admin)],
    background_tasks: BackgroundTasks,
) -> Any:
    \"\"\"Approve or reject a consumption modification request.\"\"\"
    from app.repositories.consumption_repository import ConsumptionRepository
    
    repo = ConsumptionRepository(db)
    consumption = await repo.get_by_id(consumption_id)
    
    if not consumption:
        raise HTTPException(status_code=404, detail="Consumption record not found")
        
    if consumption.request_status != "PENDING":
        raise HTTPException(status_code=400, detail="Request is not pending")
        
    if approved:
        consumption.request_status = "APPROVED"
        if consumption.requested_quantity is not None:
            consumption.quantity = consumption.requested_quantity
        if consumption.requested_extra_qty is not None:
            consumption.extra_qty = consumption.requested_extra_qty
            
        # Re-calc bill on approval
        month_str = consumption.date.strftime("%Y-%m")
        redis = await get_redis()
        if redis:
            await redis.delete(f"grid:{month_str}")
            
        from app.api.v1.endpoints.admin import recalculate_user_bill_task
        background_tasks.add_task(recalculate_user_bill_task, consumption.user_id, month_str)
    else:
        consumption.request_status = "REJECTED"
        
    consumption.confirmed_by = current_user.id
    db.add(consumption)
    await db.commit()
    
    return {"status": "success", "message": "Request processed"}
"""

file_path = r"c:\dairy\backend\app\api\v1\endpoints\consumption.py"

with open(file_path, "a", encoding="utf-8") as f:
    f.write(routes_to_append)

print("Appended routes successfully")
