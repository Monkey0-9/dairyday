from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import io
import calendar
from datetime import date

class PdfService:
    @staticmethod
    def generate_consumption_report(month_str: str, users_data: list):
        """
        Generates a PDF report for monthly consumption.
        users_data expected format:
        [
            {
                "name": "User Name",
                "phone": "Phone",
                "daily_liters": {"2026-02-01": 1.0, ...}
            },
            ...
        ]
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            rightMargin=10, leftMargin=10,
            topMargin=20, bottomMargin=20,
            title=f"Consumption Report - {month_str}"
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = styles["Heading1"]
        title_style.alignment = 1 # Center
        elements.append(Paragraph(f"Monthly Consumption Report - {month_str}", title_style))
        elements.append(Spacer(1, 20))
        
        # Data Preparation
        year, month = map(int, month_str.split("-"))
        _, last_day = calendar.monthrange(year, month)
        
        # Header Row
        headers = ["Customer"] + [str(d) for d in range(1, last_day + 1)] + ["Total"]
        
        table_data = [headers]
        
        # Body Rows
        for user in users_data:
            row = [user["name"][:20]] # Truncate name if too long
            daily = user.get("daily_liters", {})
            total = 0.0
            
            for d in range(1, last_day + 1):
                day_date = date(year, month, d)
                day_str = day_date.isoformat()
                
                # Handle potential Decimal/float mix
                val = float(daily.get(day_str, 0.0))
                
                if val > 0:
                    # formatting: 1.0 -> 1, 1.5 -> 1.5
                    display_val = f"{val:g}" 
                else:
                    display_val = "-"
                
                row.append(display_val)
                total += val
                
            row.append(f"{total:g}")
            table_data.append(row)
            
        # Table Style
        # A4 Landscape width ~842 pts. Margins 20. Usable ~800.
        # Name col: 100 pts (Reduced from 120 to give space to days)
        # Days: 31 cols. 
        # Total: 35 pts
        # Remaining for days: 800 - 135 = 665. 665 / 31 = ~21.4 pts.
        
        col_widths = [100] + [21] * last_day + [35]
        
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1a1a1a")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'), # Name column left align
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            
            # Alternating colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.whitesmoke]),
        ]))
        
        elements.append(t)
        
        # Build
        doc.build(elements)
        buffer.seek(0)
        return buffer
