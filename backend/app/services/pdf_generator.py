from datetime import date as date_type
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from io import BytesIO
from app.models.bill import Bill
from app.models.user import User
from app.models.consumption import Consumption
from typing import List

def generate_invoice_pdf(user: User, bill: Bill, consumptions: List[Consumption]) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = styles['Title']
    title_style.textColor = colors.HexColor("#1e293b") # Slate 800
    title_style.fontSize = 20
    title_style.alignment = 0 # Left align

    label_style = styles['Normal']
    label_style.fontSize = 9
    label_style.textColor = colors.HexColor("#64748b") # Slate 500

    value_style = styles['Normal']
    value_style.fontSize = 10
    value_style.textColor = colors.HexColor("#0f172a") # Slate 900
    value_style.fontName = 'Helvetica-Bold'

    elements = []

    # Header Row
    elements.append(Paragraph("DairyDay Invoice", title_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"Period: {bill.month}", label_style))
    elements.append(Spacer(1, 24))

    # Info Grid (Customer & Bill Info)
    info_data = [
        [Paragraph("CUSTOMER DETAILS", label_style), Paragraph("INVOICE DETAILS", label_style)],
        [Paragraph(user.name, value_style), Paragraph(f"Invoice ID: {str(bill.id)[:8]}...", value_style)],
        [Paragraph(f"Phone: {user.phone or 'N/A'}", label_style), Paragraph(f"Issued On: {date_type.today()}", label_style)],
        [Paragraph(f"Email: {user.email or 'N/A'}", label_style), Paragraph(f"Status: {bill.status}", value_style)]
    ]
    info_table = Table(info_data, colWidths=[250, 250])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 32))

    # Table Data
    data = [[
        Paragraph('DATE', label_style),
        Paragraph('DESCRIPTION', label_style),
        Paragraph('QUANTITY', label_style),
        Paragraph('UNIT PRICE', label_style),
        Paragraph('SUBTOTAL', label_style)
    ]]

    for c in consumptions:
        subtotal = float(c.quantity) * float(user.price_per_liter)
        data.append([
            str(c.date),
            'Fresh Milk Consumption',
            f"{c.quantity} L",
            f"₹{user.price_per_liter}/L",
            f"₹{subtotal:.2f}"
        ])

    # Grand Total
    data.append(['', '', '', Paragraph('TOTAL AMOUNT', value_style), Paragraph(f"₹{bill.total_amount:.2f}", value_style)])

    # Table Style
    table = Table(data, colWidths=[80, 160, 80, 100, 80])
    table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#e2e8f0")), # Border Bottom Header
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'), # Right align quantity and amounts
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#475569")),
        ('GRID', (0, 0), (-1, -2), 0.1, colors.HexColor("#f1f5f9")), # Subtle grid
        ('LINEABOVE', (3, -1), (-1, -1), 1, colors.HexColor("#1e293b")), # Total separator
    ]))

    elements.append(table)
    elements.append(Spacer(1, 40))

    # Footer
    footer_style = styles['Normal']
    footer_style.fontSize = 8
    footer_style.alignment = 1 # Center
    footer_style.textColor = colors.grey

    elements.append(Paragraph("This is a computer generated invoice. No signature required.", footer_style))
    elements.append(Paragraph("Powered by DairyDay Enterprise v1.0", footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_consumption_report_pdf(user_name: str, month: str, data: List[dict], is_admin: bool = False) -> BytesIO:
    """
    Generate a PDF report for milk consumption.
    If is_admin is True, the data contains multiple users.
    If is_admin is False, the data is for a single user (the one named user_name).
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = styles['Title']
    title_style.textColor = colors.HexColor("#1e293b")
    title_style.fontSize = 18
    title_style.alignment = 1 # Center

    subtitle_style = styles['Normal']
    subtitle_style.fontSize = 10
    subtitle_style.textColor = colors.HexColor("#64748b")
    subtitle_style.alignment = 1

    label_style = styles['Normal']
    label_style.fontSize = 8
    label_style.textColor = colors.HexColor("#475569")
    label_style.fontName = 'Helvetica-Bold'

    elements = []

    # Title
    elements.append(Paragraph("Milk Consumption Report", title_style))
    elements.append(Paragraph(f"Period: {month}", subtitle_style))
    if not is_admin:
        elements.append(Paragraph(f"Customer: {user_name}", subtitle_style))
    elements.append(Spacer(1, 24))

    # Prepare Table
    if is_admin:
        # Admin view: Multi-user summary
        table_data = [[
            Paragraph('CUSTOMER', label_style),
            Paragraph('EMAIL', label_style),
            Paragraph('MONTHLY TOTAL (L)', label_style)
        ]]
        
        grand_total = 0.0
        for item in data:
            total = float(item.get("Total", 0.0))
            grand_total += total
            table_data.append([
                item.get("User Name", "Unknown"),
                item.get("Email", "N/A"),
                f"{total:.1f} L"
            ])
        
        table_data.append(['', Paragraph('GRAND TOTAL', label_style), Paragraph(f"{grand_total:.1f} L", label_style)])
        col_widths = [200, 200, 100]
    else:
        # User view: Daily records
        table_data = [[
            Paragraph('DATE/DAY', label_style),
            Paragraph('DESCRIPTION', label_style),
            Paragraph('QUANTITY (L)', label_style)
        ]]
        
        # Data passed to this function for user is actually the single row dict
        user_row = data[0] if isinstance(data, list) else data
        total = float(user_row.get("Total", 0.0))
        
        # We need to reconstruct daily entries. The dict keys are "1", "2", etc.
        # But wait, the export_consumption function already prepares the dict correctly.
        # Let's see what keys are there.
        for key, val in user_row.items():
            if key.isdigit():
                if float(val) > 0:
                    table_data.append([
                        f"Day {key}",
                        "Fresh Milk Delivery",
                        f"{float(val):.1f} L"
                    ])
        
        table_data.append(['', Paragraph('TOTAL CONSUMPTION', label_style), Paragraph(f"{total:.1f} L", label_style)])
        col_widths = [150, 200, 150]

    # Table Style
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
        ('LINEBELOW', (0, -1), (-1, -1), 0, colors.white), # Remove bottom line for total
        ('LINEABOVE', (1, -1), (-1, -1), 1, colors.HexColor("#1e293b")),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -2), 0.1, colors.HexColor("#f1f5f9")),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 40))

    # Footer
    footer_style = styles['Normal']
    footer_style.fontSize = 7
    footer_style.alignment = 1
    footer_style.textColor = colors.grey

    elements.append(Paragraph(f"Generated on: {date_type.today().strftime('%B %d, %Y')}", footer_style))
    elements.append(Paragraph("DairyDay Enterprise - Pure Milk, Pure Trust.", footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
