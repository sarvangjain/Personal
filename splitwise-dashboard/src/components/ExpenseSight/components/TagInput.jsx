/**
 * TagInput - Autocomplete input for selecting and creating tags
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, Hash, Check } from 'lucide-react';
import TagBadge, { TAG_COLOR_OPTIONS, getTagColor } from './TagBadge';

export default function TagInput({
  selectedTags = [],
  availableTags = [],
  onTagsChange,
  onCreateTag,
  placeholder = 'Add tags...',
  maxTags = 5,
}) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newTagColor, setNewTagColor] = useState('teal');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Filter suggestions based on input
  const filteredTags = availableTags.filter(tag => {
    const tagName = tag.name.toLowerCase();
    const search = inputValue.toLowerCase().trim();
    // Don't show already selected tags
    if (selectedTags.includes(tagName)) return false;
    // Show all if empty, otherwise filter
    return !search || tagName.includes(search);
  });

  // Check if input matches existing tag exactly
  const exactMatch = availableTags.find(
    t => t.name.toLowerCase() === inputValue.toLowerCase().trim()
  );
  
  // Can create new tag if no exact match and input is valid
  const canCreateNew = inputValue.trim().length >= 2 && 
    !exactMatch && 
    !selectedTags.includes(inputValue.toLowerCase().trim());

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTag = (tagName) => {
    if (selectedTags.length >= maxTags) return;
    
    const newTags = [...selectedTags, tagName.toLowerCase()];
    onTagsChange(newTags);
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagName) => {
    const newTags = selectedTags.filter(t => t !== tagName);
    onTagsChange(newTags);
  };

  const handleCreateTag = async () => {
    if (!canCreateNew) return;
    
    const newTagName = inputValue.toLowerCase().trim();
    
    // Call parent's create function if provided
    if (onCreateTag) {
      await onCreateTag({ name: newTagName, color: newTagColor });
    }
    
    // Add to selected
    handleSelectTag(newTagName);
    setShowColorPicker(false);
    setNewTagColor('teal');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (filteredTags.length > 0) {
        handleSelectTag(filteredTags[0].name);
      } else if (canCreateNew) {
        if (showColorPicker) {
          handleCreateTag();
        } else {
          setShowColorPicker(true);
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setShowColorPicker(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags + input */}
      <div 
        className="flex flex-wrap gap-1.5 p-2 bg-stone-800/50 border border-stone-700/50 rounded-xl min-h-[42px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map(tagName => {
          const tagData = availableTags.find(t => t.name === tagName);
          return (
            <TagBadge
              key={tagName}
              name={tagName}
              color={tagData?.color || 'stone'}
              size="sm"
              onRemove={() => handleRemoveTag(tagName)}
            />
          );
        })}
        
        {selectedTags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
              setShowColorPicker(false);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-stone-200 placeholder-stone-500 focus:outline-none"
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (filteredTags.length > 0 || canCreateNew) && (
        <div className="absolute z-50 mt-1 w-full bg-stone-800 border border-stone-700 rounded-xl shadow-xl overflow-hidden">
          {/* Suggestions */}
          {filteredTags.length > 0 && !showColorPicker && (
            <div className="max-h-40 overflow-y-auto">
              {filteredTags.slice(0, 6).map(tag => (
                <button
                  key={tag.name}
                  onClick={() => handleSelectTag(tag.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-700/50 transition-colors text-left"
                >
                  <Hash size={12} className={getTagColor(tag.color).text} />
                  <span className="text-sm text-stone-300">{tag.name}</span>
                  {!tag.isCustom && (
                    <span className="text-[9px] text-stone-500 ml-auto">suggested</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Create new tag option */}
          {canCreateNew && !showColorPicker && (
            <>
              {filteredTags.length > 0 && <div className="h-px bg-stone-700" />}
              <button
                onClick={() => setShowColorPicker(true)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-stone-700/50 transition-colors text-left"
              >
                <Plus size={12} className="text-teal-400" />
                <span className="text-sm text-teal-400">
                  Create "{inputValue.trim()}"
                </span>
              </button>
            </>
          )}

          {/* Color picker for new tag */}
          {showColorPicker && (
            <div className="p-3 space-y-3">
              <p className="text-xs text-stone-400">Pick a color for "{inputValue.trim()}"</p>
              <div className="flex flex-wrap gap-2">
                {TAG_COLOR_OPTIONS.map(color => {
                  const colors = getTagColor(color);
                  return (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg ${colors.bg} flex items-center justify-center transition-all touch-manipulation ${
                        newTagColor === color ? 'ring-2 ring-white/30 scale-110' : 'hover:scale-105 active:scale-95'
                      }`}
                    >
                      {newTagColor === color && (
                        <Check size={14} className={colors.text} />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleCreateTag}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation"
              >
                Create Tag
              </button>
            </div>
          )}
        </div>
      )}

      {/* Max tags warning */}
      {selectedTags.length >= maxTags && (
        <p className="text-[10px] text-stone-500 mt-1">
          Maximum {maxTags} tags allowed
        </p>
      )}
    </div>
  );
}
