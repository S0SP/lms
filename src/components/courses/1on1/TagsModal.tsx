'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Search, Plus, Tag as TagIcon } from 'lucide-react';

export interface TagItem {
  id: string;
  name: string;
  color: string;
  category?: string;
}

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTagNames: string[];
  onApply: (tags: string[]) => void;
}

const PRESET_COLORS = [
  { name: 'Red', hex: '#EF4444', bg: 'bg-red-100 text-red-700 border-red-300' },
  { name: 'Amber', hex: '#F59E0B', bg: 'bg-amber-100 text-amber-700 border-amber-300' },
  { name: 'Green', hex: '#10B981', bg: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { name: 'Blue', hex: '#3B82F6', bg: 'bg-blue-100 text-blue-700 border-blue-300' },
  { name: 'Purple', hex: '#8B5CF6', bg: 'bg-purple-100 text-purple-700 border-purple-300' },
  { name: 'Pink', hex: '#EC4899', bg: 'bg-pink-100 text-pink-700 border-pink-300' },
];

export function TagsModal({
  isOpen,
  onClose,
  selectedTagNames,
  onApply,
}: TagsModalProps) {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelected(selectedTagNames || []);
      fetchTags();
    }
  }, [isOpen, selectedTagNames]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/tags');
      const data = await res.json();
      if (data.tags) {
        setTags(data.tags);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleTag = (tagName: string) => {
    if (selected.includes(tagName)) {
      setSelected(selected.filter((t) => t !== tagName));
    } else {
      setSelected([...selected, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    setSelected(selected.filter((t) => t !== tagName));
  };

  const handleCreateTag = async () => {
    if (!search.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/v1/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: search.trim(),
          color: selectedColor,
          category: 'session',
        }),
      });
      const data = await res.json();
      if (data.tag) {
        setTags([data.tag, ...tags]);
        setSelected([...selected, data.tag.name]);
        setSearch('');
      }
    } catch (err) {
      console.error('Failed to create tag:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = tags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Tags
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected tags badges */}
        {selected.length > 0 && (
          <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2">
            {selected.map((name) => {
              const tagObj = tags.find((t) => t.name === name);
              const colorHex = tagObj?.color || '#3B82F6';
              return (
                <span
                  key={name}
                  style={{
                    backgroundColor: `${colorHex}15`,
                    borderColor: `${colorHex}40`,
                    color: colorHex,
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-xs"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: colorHex }}
                  />
                  {name}
                  <button
                    type="button"
                    onClick={() => removeTag(name)}
                    className="hover:opacity-75 focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Search & Create input */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or create tag..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {search.trim() && !exactMatch && (
            <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                  Create tag &quot;{search}&quot;:
                </span>
                <div className="flex items-center gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-4 h-4 rounded-full transition ${
                        selectedColor === c.hex ? 'ring-2 ring-offset-1 ring-blue-600 scale-110' : 'opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          )}
        </div>

        {/* Tag List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {loading ? (
            <div className="py-8 text-center text-xs text-neutral-400">Loading tags...</div>
          ) : filteredTags.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              No tags found. Type a name to create one.
            </div>
          ) : (
            filteredTags.map((tag) => {
              const isChecked = selected.includes(tag.name);
              return (
                <div
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    isChecked
                      ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color || '#3B82F6' }}
                    />
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {tag.name}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                      isChecked
                        ? 'bg-blue-600 text-white'
                        : 'border border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(selected);
              onClose();
            }}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            Apply Tags
          </button>
        </div>
      </div>
    </div>
  );
}
