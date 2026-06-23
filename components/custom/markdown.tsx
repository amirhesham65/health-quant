import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const components = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <pre
          {...props}
          className={`${className} w-full max-w-full overflow-x-auto rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800`}
        >
          <code className={match[1]}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className} break-words rounded-md bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-800`}
          {...props}
        >
          {children}
        </code>
      );
    },
    ol: ({ node, children, ...props }: any) => {
      return (
        <ol className="ml-4 list-outside list-decimal break-words" {...props}>
          {children}
        </ol>
      );
    },
    li: ({ node, children, ...props }: any) => {
      return (
        <li className="py-1 break-words" {...props}>
          {children}
        </li>
      );
    },
    ul: ({ node, children, ...props }: any) => {
      return (
        <ul className="ml-4 list-outside list-decimal break-words" {...props}>
          {children}
        </ul>
      );
    },
    p: ({ node, children, ...props }: any) => {
      return (
        <p className="whitespace-pre-wrap break-words" {...props}>
          {children}
        </p>
      );
    },
    strong: ({ node, children, ...props }: any) => {
      return (
        <span className="font-semibold" {...props}>
          {children}
        </span>
      );
    },
    a: ({ node, children, ...props }: any) => {
      return (
        <Link
          className="break-words text-blue-500 hover:underline"
          target="_blank"
          rel="noreferrer"
          {...props}
        >
          {children}
        </Link>
      );
    },
    img: ({ node, src, alt, ...props }: any) => {
      if (!src || src.trim() === '') {
        return null;
      }
      return (
        <img
          src={src}
          alt={alt || ''}
          className="max-w-full h-auto rounded-lg my-2"
          {...props}
        />
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
