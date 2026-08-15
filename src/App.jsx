import { useState, useEffect } from 'react';
import Challenge from '@/pages/Challenge.jsx';
import CourseMap from '@/pages/CourseMap.jsx';
import Landing from '@/pages/Landing.jsx';

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const match = hash.match(/^#\/challenge\/([^/]+)/);

  if (match) {
    return <Challenge challengeId={decodeURIComponent(match[1])} onExit={() => { window.location.hash = '#/course'; }} onSelect={(id) => { window.location.hash = `#/challenge/${id}`; }} />;
  }
  if (hash.startsWith('#/course')) {
    return <CourseMap onSelect={(id) => { window.location.hash = `#/challenge/${id}`; }} />;
  }
  return <Landing />;
}
