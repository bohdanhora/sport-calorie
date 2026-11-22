import { Fragment, type ReactNode } from 'react';

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; text: string };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

const parseBlocks = (source: string): Block[] => {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };

  for (const line of source.split('\n')) {
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    const item = bullet ?? numbered;

    if (line.trim() === '') {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ kind: 'heading', text: heading[1] });
    } else if (item) {
      flush();
      const ordered = numbered !== null && bullet === null;
      const last = blocks.at(-1);

      if (last?.kind === 'list' && last.ordered === ordered) {
        last.items.push(item[1]);
      } else {
        blocks.push({ kind: 'list', ordered, items: [item[1]] });
      }
    } else {
      paragraph.push(line.trim());
    }
  }

  flush();

  return blocks;
};

const renderInline = (text: string): ReactNode =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index} className="text-foreground font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );

export const AnswerText = ({ source }: { source: string }) => (
  <div className="space-y-3 text-sm leading-relaxed">
    {parseBlocks(source).map((block, index) => {
      if (block.kind === 'heading') {
        return (
          <h3 key={index} className="label-caps text-foreground pt-2 first:pt-0">
            {renderInline(block.text)}
          </h3>
        );
      }

      if (block.kind === 'list') {
        const List = block.ordered ? 'ol' : 'ul';

        return (
          <List key={index} className="space-y-1.5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2.5">
                {block.ordered ? (
                  <span className="numeric text-accent-ink shrink-0 text-xs leading-relaxed">
                    {itemIndex + 1}.
                  </span>
                ) : (
                  <span aria-hidden className="bg-accent-ink mt-2 size-1.5 shrink-0" />
                )}
                <span className="min-w-0 break-words">{renderInline(item)}</span>
              </li>
            ))}
          </List>
        );
      }

      return (
        <p key={index} className="break-words">
          {renderInline(block.text)}
        </p>
      );
    })}
  </div>
);
