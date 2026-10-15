/**
 * The platform contact page — `/contact`.
 *
 * The form that used to sit on the marketing homepage (`/#contact`, TASK 7)
 * now has its own page (owner decision D6 retired that homepage). Same
 * form, same `POST public/contact` contract, same Platform Owner inbox;
 * only its address changed. `?topic=sales` (the holding page's link)
 * preselects a topic; anything else leaves the choice to the visitor.
 */
import { useSearchParams } from 'react-router-dom';
import { MarketingContactSection } from '../components/MarketingContactSection';
import { MARKETING_CONTACT_TOPICS } from '../utils/marketing-contact';
import type { PlatformContactTopic } from '../services/PlatformContactService';

function isTopic(value: string | null): value is PlatformContactTopic {
  return MARKETING_CONTACT_TOPICS.some((topic) => topic === value);
}

export default function ContactPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const topic = searchParams.get('topic');

  return (
    <MarketingContactSection
      defaultTopic={isTopic(topic) ? topic : undefined}
    />
  );
}
