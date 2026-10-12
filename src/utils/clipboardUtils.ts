/**
 * Safe Clipboard Utility with fallback for iframe / non-focused document restrictions.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Try modern navigator.clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, attempting DOM fallback:', err);
    }
  }

  // Method 2: Fallback using temporary textarea element and document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Position off-screen and make invisible
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // Focus and select the text
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 999999); // For mobile devices
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (fallbackErr) {
    console.error('DOM clipboard fallback failed:', fallbackErr);
    return false;
  }
}
