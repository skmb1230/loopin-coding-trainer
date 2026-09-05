import { useEffect, useRef } from 'react';
import { minimalSetup } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

function editorAppearance(theme, fontSize) {
  return [EditorView.theme({
    '&': { height: '100%', fontSize: `${fontSize}px`, backgroundColor: theme === 'dark' ? '#111318' : '#fbfbfc' },
    '.cm-scroller': { fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', lineHeight: '1.7' },
    '.cm-content': { padding: '18px 0' },
    '.cm-gutters': { backgroundColor: theme === 'dark' ? '#111318' : '#fbfbfc', border: 'none', color: theme === 'dark' ? '#666b78' : '#a1a1aa' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: theme === 'dark' ? '#191c23' : '#f1f3f8' },
    '&.cm-focused': { outline: 'none' },
  }), theme === 'dark' ? oneDark : []];
}

export default function CodeEditor({ value, problemId, language = 'javascript', languageLabel = 'JavaScript', onChange, onRun, onSubmit, onSave, theme = 'light', fontSize = 14, readOnly = false }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const syncingRef = useRef(false);
  const callbacks = useRef({ onChange, onRun, onSubmit, onSave });
  const appearance = useRef(new Compartment());
  const editable = useRef(new Compartment());
  const syntax = useRef(new Compartment());
  callbacks.current = { onChange, onRun, onSubmit, onSave };

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const customKeys = keymap.of([
      { key: 'Mod-Enter', run: () => { callbacks.current.onRun(); return true; } },
      { key: 'Mod-Shift-Enter', run: () => { callbacks.current.onSubmit(); return true; } },
      { key: 'Mod-s', run: () => { callbacks.current.onSave(); return true; } },
    ]);
    const state = EditorState.create({
      doc: value,
      extensions: [
        minimalSetup,
        syntax.current.of(language === 'java' ? java() : javascript()),
        customKeys,
        EditorView.lineWrapping,
        appearance.current.of(editorAppearance(theme, fontSize)),
        editable.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncingRef.current) callbacks.current.onChange(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, [problemId]);

  // Reconfigure presentation/interaction without losing the document, cursor,
  // or undo history when changing font size or waiting for execution/storage.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: appearance.current.reconfigure(editorAppearance(theme, fontSize)) });
  }, [theme, fontSize]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: editable.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]) });
  }, [readOnly]);
  useEffect(() => {
    viewRef.current?.dispatch({ effects: syntax.current.reconfigure(language === 'java' ? java() : javascript()) });
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    syncingRef.current = true;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    syncingRef.current = false;
  }, [value]);

  return <div className="code-editor" ref={hostRef} aria-label={`${languageLabel} 코드 에디터`} />;
}
