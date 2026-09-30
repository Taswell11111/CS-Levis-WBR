import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# I want to add the share UI to the header when we are in dashboard mode.
# Look for <button id="btn-download-pdf-sticky" ...>
# And add my publish UI next to it.

publish_ui = """
              {publishedUrl ? (
                <div className="flex items-center gap-2">
                  <input type="text" readOnly value={publishedUrl} className="text-[10px] bg-gray-100 border border-gray-200 rounded px-2 py-1 w-48 font-mono text-gray-600 outline-none" onClick={e => (e.target as HTMLInputElement).select()} />
                  <a href={publishedUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-[10px] font-bold underline">Open</a>
                </div>
              ) : (
                <button
                  onClick={publishReport}
                  disabled={publishing || loading}
                  className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold py-1.5 px-3 rounded shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Globe size={13} className={publishing ? "animate-spin" : ""} />
                  {publishing ? "Publishing..." : "Publish & Share Link"}
                </button>
              )}
"""

content = content.replace('<button\n                id="btn-download-pdf-sticky"', publish_ui + '\n              <button\n                id="btn-download-pdf-sticky"')

# I also need to make sure the user can sign in. We can add a sign in button to the landing page.
# Find Phase 2 section on landing page.
auth_ui = """
              {!user && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500">To share reports, you must sign in:</span>
                  <button onClick={handleSignIn} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[10px] font-bold py-1 px-3 rounded shadow-sm flex items-center gap-1.5 transition-colors">
                    <Globe size={11} />
                    Sign in with Google
                  </button>
                </div>
              )}
"""
# inject auth_ui above the Phase 2 button
content = content.replace('<button\n                type="button"\n                onClick={() => {\n                  if (data) {\n                    setCurrentView(\'dashboard\');', auth_ui + '\n              <button\n                type="button"\n                onClick={() => {\n                  if (data) {\n                    setCurrentView(\'dashboard\');')


with open('src/App.tsx', 'w') as f:
    f.write(content)
