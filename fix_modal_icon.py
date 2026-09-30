with open('src/components/Page1DetailsModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("case 'tickets': ", "case 'stalled_shipments': return <AlertCircle size={20} className=\"text-red-600\" />;\n      case 'tickets': ")

with open('src/components/Page1DetailsModal.tsx', 'w') as f:
    f.write(content)
