import {
PortableText,
type PortableTextComponents,
} from '@portabletext/react';

import type {
PortableTextBlock,
} from '@/data/types';

interface PortableTextRendererProps {
value?:
| PortableTextBlock[]
| string
| null;

className?: string;
}

const portableTextComponents: PortableTextComponents = {
block: {
normal: ({ children }) => ( <p className="mb-5 text-gray-700 leading-8">
{children} </p>
),

  
h1: ({ children }) => (
  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-10 mb-5">
    {children}
  </h1>
),

h2: ({ children }) => (
  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-10 mb-5">
    {children}
  </h2>
),

h3: ({ children }) => (
  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mt-8 mb-4">
    {children}
  </h3>
),

h4: ({ children }) => (
  <h4 className="text-lg md:text-xl font-bold text-gray-900 mt-7 mb-3">
    {children}
  </h4>
),

blockquote: ({ children }) => (
  <blockquote className="my-8 border-s-4 border-[#167F65] bg-[#167F65]/5 px-6 py-5 italic text-gray-700 rounded-e-xl">
    {children}
  </blockquote>
),
  

},

list: {
bullet: ({ children }) => ( <ul className="list-disc ps-6 mb-6 space-y-2 text-gray-700">
{children} </ul>
),

  
number: ({ children }) => (
  <ol className="list-decimal ps-6 mb-6 space-y-2 text-gray-700">
    {children}
  </ol>
),
  

},

listItem: {
bullet: ({ children }) => ( <li className="leading-8">
{children} </li>
),

  
number: ({ children }) => (
  <li className="leading-8">
    {children}
  </li>
),
  

},

marks: {
strong: ({ children }) => ( <strong className="font-bold text-gray-900">
{children} </strong>
),

  
em: ({ children }) => (
  <em className="italic">
    {children}
  </em>
),

underline: ({ children }) => (
  <span className="underline underline-offset-4">
    {children}
  </span>
),

link: ({ children, value }) => {
  const href =
    typeof value?.href === 'string'
      ? value.href
      : '#';

  const isExternal =
    href.startsWith('http://') ||
    href.startsWith('https://');

  return (
    <a
      href={href}
      target={
        isExternal
          ? '_blank'
          : undefined
      }
      rel={
        isExternal
          ? 'noopener noreferrer'
          : undefined
      }
      className="font-medium text-[#167F65] underline underline-offset-4 hover:text-[#125e4c]"
    >
      {children}
    </a>
  );
},
  

},

hardBreak: () => <br />,
};

function renderPlainText(
value: string
) {
return value
.split(/\n\s*\n/)
.filter(
(paragraph) =>
paragraph.trim().length > 0
)
.map((paragraph, index) => ( <p
     key={index}
     className="mb-5 text-gray-700 leading-8 whitespace-pre-line"
   >
{paragraph} </p>
));
}

export function PortableTextRenderer({
value,
className = '',
}: PortableTextRendererProps) {
if (!value) {
return null;
}

if (typeof value === 'string') {
return ( <div className={className}>
{renderPlainText(value)} </div>
);
}

if (!Array.isArray(value) || value.length === 0) {
return null;
}

return ( <div className={className}>
<PortableText
value={value as any}
components={portableTextComponents}
/> </div>
);
}
