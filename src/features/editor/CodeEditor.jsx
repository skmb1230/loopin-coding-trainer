import { useEffect, useRef } from 'react';
import { minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

export default function CodeEditor({ value, problemId, onChange, onRun, onSubmit, onSave, theme = 'light', fontSize = 14 }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const syncingRef = useRef(false);
  const callbacks = useRef({ onChange, onRun, onSubmit, onSave });
  callbacks.current = { onChange, onRun, onSubmit, onSave };

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const customKeys = keymap.of([
      { key: 'Mod-Enter', run: () => { callbacks.current.onRun(); return true; } },
      { key: 'Mod-Shift-Enter', run: () => { callbacks.current.onSubmit(); return true; } },
      { key: 'Mod-s', run: () => { callbacks.current.onSave(); return true; } },
    ]);
    const editorTheme = EditorView.theme({
      '&': { height: '100%', fontSize: `${fontSize}px`, backgroundColor: theme === 'dark' ? '#111318' : '#fbfbfc' },
      '.cm-scroller': { fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', lineHeight: '1.7' },
      '.cm-content': { padding: '18px 0' },
      '.cm-gutters': { backgroundColor: theme === 'dark' ? '#111318' : '#fbfbfc', border: 'none', color: theme === 'dark' ? '#666b78' : '#a1a1aa' },
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: theme === 'dark' ? '#191c23' : '#f1f3f8' },
      '&.cm-focused': { outline: 'none' },
    });
    const state = EditorState.create({
      doc: value,
      extensions: [
        minimalSetup,
        javascript(),
        customKeys,
        EditorView.lineWrapping,
        editorTheme,
        theme === 'dark' ? oneDark : [],
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncingRef.current) callbacks.current.onChange(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, [problemId, theme, fontSize]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    syncingRef.current = true;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    syncingRef.current = false;
  }, [value]);

  return <div className="code-editor" ref={hostRef} aria-label="JavaScript 코드 에디터" />;
}
