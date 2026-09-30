import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

imports = """import { db, auth } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
"""

# Insert imports after import { WBRData } from './types';
content = content.replace("import { WBRData } from './types';", imports + "import { WBRData } from './types';")

# Inside App(), add user state
user_state = """  const [user, setUser] = useState<User | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const rid = searchParams.get('reportId');
    if (rid) {
      setReportId(rid);
      setCurrentView('dashboard');
      setIsInputExpanded(false);
      loadReport(rid);
    } else {
      // Generate initial live WBR and fetch live summaries for landing page
      fetchWBRData();
      handleSyncReturnGo();
      handleFetchParcelNinja();
    }
  }, []);

  const loadReport = async (id: string) => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'reports', id));
      if (snap.exists()) {
        const reportData = snap.data();
        setData(reportData.data);
      } else {
        setError('Report not found or you do not have permission.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error loading report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const publishReport = async () => {
    if (!user) {
      alert("Please sign in to publish a report.");
      return;
    }
    if (!data) return;
    
    setPublishing(true);
    try {
      const newReportId = crypto.randomUUID();
      await setDoc(doc(db, 'reports', newReportId), {
        createdAt: serverTimestamp(),
        authorId: user.uid,
        data: data
      });
      const url = new URL(window.location.href);
      url.searchParams.set('reportId', newReportId);
      setPublishedUrl(url.toString());
    } catch (err: any) {
      console.error(err);
      alert('Failed to publish: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => console.error(err));
  };
"""

# replace `useEffect(() => { ... fetchWBRData(); ... }, []);` with our new effect
# finding the exact spot to inject:
content = re.sub(r'  useEffect\(\(\) => \{\n    // Generate initial live WBR.*?\n  \}, \[\]\);\n', '', content, flags=re.DOTALL)

# Inject states at the top of App()
content = content.replace("  const [error, setError] = useState<string | null>(null);", "  const [error, setError] = useState<string | null>(null);\n" + user_state)

with open('src/App.tsx', 'w') as f:
    f.write(content)

