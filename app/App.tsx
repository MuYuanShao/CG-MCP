import { FeedbackProvider } from './components/AppFeedback';
import AppContent from './AppContent';

export default function App() {
  return (
    <FeedbackProvider>
      <AppContent />
    </FeedbackProvider>
  );
}
