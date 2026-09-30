import re

with open('src/components/WBRPage1.tsx', 'r') as f:
    content = f.read()

replacement = """                    <div 
                      className="flex justify-between text-[10px] mb-0.5 cursor-pointer hover:bg-red-50 p-1 -mx-1 rounded transition-colors"
                      onClick={() => onOpenDetail?.({
                        title: 'Stalled Shipments (> 2 Days)',
                        type: 'stalled_shipments',
                        data: parcelNinja?.outbound?.pendingDispatch?.details?.filter((d: any) => {
                          const status = d.status?.toLowerCase() || '';
                          const isStalled = status.includes('stalled') || status.includes('no status') || status.includes('> 2 days');
                          return isStalled;
                        }) || []
                      })}
                    >"""

content = content.replace('<div className="flex justify-between text-[10px] mb-0.5">', replacement, 1)

with open('src/components/WBRPage1.tsx', 'w') as f:
    f.write(content)
