function MenuBar({ editor, saving }){
  return (
      <div className="flex gap-1 border-b p-2">
              <button
                type="button"
                aria-label="粗體"
                aria-pressed={editor?.isActive("bold") ?? false}
                disabled={!editor || saving}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className="style-text-formatting"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                aria-label="斜體"
                aria-pressed={editor?.isActive("italic") ?? false}
                disabled={!editor || saving}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className="style-text-formatting"
              >
                I
              </button>
              <button
                type="button"
                aria-label="項目符號清單"
                aria-pressed={editor?.isActive("bulletList") ?? false}
                disabled={!editor || saving}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                 className="style-text-formatting"
              >
                清單
              </button>
            </div>
  )
}
export default MenuBar;