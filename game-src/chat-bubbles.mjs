// Presentation only: preserve the original message and choice metadata in storage.
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh',{granularity:'sentence'}):null;
export function splitBubbles(value){return String(value??'').split(/\r?\n+/).flatMap(line=>segmenter?Array.from(segmenter.segment(line),part=>part.segment):(line.match(/[^。！？!?]+[。！？!?]*[”’」』]*|[。！？!?]+/g)||[])).map(text=>text.trim()).filter(Boolean)}
export function bubbleRows(rows,key){return rows.flatMap(row=>row.speaker==='system'?[row]:splitBubbles(row[key]).map(text=>({...row,[key]:text})))}
export default {split:splitBubbles,rows:bubbleRows};
