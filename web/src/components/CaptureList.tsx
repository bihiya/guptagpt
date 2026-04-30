import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import type { CaptureItem } from '../types';

type CaptureTab = 'photo' | 'html' | 'source';
type SortBy = 'newest' | 'oldest' | 'title';
type FilterTag = 'all' | 'bug' | 'design' | 'qa';

interface ViewConfig {
  sortBy: SortBy;
  tag: FilterTag;
  query: string;
}

const PIN_KEY = 'capture-pins';
const TAG_KEY = 'capture-tags';
const VIEW_KEY = 'capture-view';

function getPreviewText(value: string) {
  return value.length > 8000 ? `${value.slice(0, 8000)}\n...` : value;
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function CaptureTabs({ item, compareItem }: { item: CaptureItem; compareItem?: CaptureItem }) {
  const [activeTab, setActiveTab] = useState<CaptureTab>('photo');
  const [copied, setCopied] = useState(false);

  const copyActiveContent = async () => {
    const content = activeTab === 'html' ? item.html : activeTab === 'source' ? item.sourceCode : item.url;
    await navigator.clipboard.writeText(getPreviewText(content));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const currentText = activeTab === 'html' ? item.html : item.sourceCode;
  const compareText = compareItem ? (activeTab === 'html' ? compareItem.html : compareItem.sourceCode) : '';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Tabs value={activeTab} onChange={(_e, v) => setActiveTab(v)}>
          <Tab value="photo" label="Photo" />
          <Tab value="html" label="HTML Viewer" />
          <Tab value="source" label="Source" />
        </Tabs>
        <Stack direction="row" spacing={1}>
          {copied && <Alert severity="success">Copied</Alert>}
          <IconButton onClick={() => void copyActiveContent()}><ContentCopyIcon /></IconButton>
        </Stack>
      </Stack>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, bgcolor: '#f8fafc' }}>
        {activeTab === 'photo' && <Box component="img" src={`data:image/png;base64,${item.screenshotBase64}`} alt={item.title} sx={{ width: '100%', maxHeight: 420, objectFit: 'contain' }} />}
        {activeTab !== 'photo' && compareItem && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <Box component="pre" sx={{ flex: 1, maxHeight: 320, overflow: 'auto' }}>{getPreviewText(currentText)}</Box>
            <Box component="pre" sx={{ flex: 1, maxHeight: 320, overflow: 'auto', borderLeft: '1px solid #ddd', pl: 1 }}>{getPreviewText(compareText)}</Box>
          </Stack>
        )}
        {activeTab !== 'photo' && !compareItem && <Box component="pre" sx={{ maxHeight: 320, overflow: 'auto' }}>{getPreviewText(currentText)}</Box>}
      </Box>
    </Box>
  );
}

export function CaptureList({ items }: { items: CaptureItem[] }) {
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>(JSON.parse(localStorage.getItem(PIN_KEY) ?? '[]'));
  const [tags, setTags] = useState<Record<string, FilterTag>>(JSON.parse(localStorage.getItem(TAG_KEY) ?? '{}'));
  const [tagFilter, setTagFilter] = useState<FilterTag>('all');
  const [query, setQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved) {
      const view = JSON.parse(saved) as ViewConfig;
      setSortBy(view.sortBy); setTagFilter(view.tag); setQuery(view.query);
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/') { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === 'j') setActiveIndex((v) => Math.min(v + 1, Math.max(0, items.length - 1)));
      if (event.key === 'k') setActiveIndex((v) => Math.max(v - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length]);

  const persistView = (next: ViewConfig) => localStorage.setItem(VIEW_KEY, JSON.stringify(next));

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !q || item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q);
      const itemTag = tags[item._id] ?? 'all';
      const matchesTag = tagFilter === 'all' || itemTag === tagFilter;
      return matchesQuery && matchesTag;
    });
  }, [items, query, tagFilter, tags]);

  const sortedItems = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'oldest') list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    else list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    list.sort((a, b) => Number(pinnedIds.includes(b._id)) - Number(pinnedIds.includes(a._id)));
    return list;
  }, [filtered, sortBy, pinnedIds]);

  const compareItem = sortedItems.find((x) => x._id !== sortedItems[activeIndex]?._id);

  const togglePin = (id: string) => {
    const next = pinnedIds.includes(id) ? pinnedIds.filter((x) => x !== id) : [...pinnedIds, id];
    setPinnedIds(next); localStorage.setItem(PIN_KEY, JSON.stringify(next));
  };

  const bulkCopy = async () => {
    const text = sortedItems.filter((x) => selectedIds.includes(x._id)).map((x) => `${x.title}\n${x.url}`).join('\n\n');
    await navigator.clipboard.writeText(text);
  };
  const bulkDelete = () => setSelectedIds([]);
  const bulkExport = (type: 'json' | 'html' | 'md') => {
    const selected = sortedItems.filter((x) => selectedIds.includes(x._id));
    if (type === 'json') downloadFile('captures.json', JSON.stringify(selected, null, 2), 'application/json');
    if (type === 'html') downloadFile('captures.html', selected.map((x) => x.html).join('\n<!-- split -->\n'), 'text/html');
    if (type === 'md') downloadFile('captures.md', selected.map((x) => `## ${x.title}\n${x.url}`).join('\n\n'), 'text/markdown');
  };

  if (!items.length) return <Typography>No captures yet.</Typography>;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <TextField label="Filter captures" value={query} onChange={(e) => { const q = e.target.value; setQuery(q); persistView({ sortBy, tag: tagFilter, query: q }); }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Sort</InputLabel>
          <Select value={sortBy} label="Sort" onChange={(e) => { const s = e.target.value as SortBy; setSortBy(s); persistView({ sortBy: s, tag: tagFilter, query }); }}>
            <MenuItem value="newest">Newest</MenuItem><MenuItem value="oldest">Oldest</MenuItem><MenuItem value="title">Title A-Z</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {(['all', 'bug', 'design', 'qa'] as FilterTag[]).map((tag) => <Chip key={tag} label={tag} color={tag === tagFilter ? 'primary' : 'default'} onClick={() => { setTagFilter(tag); persistView({ sortBy, tag, query }); }} />)}
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button onClick={() => void bulkCopy()} startIcon={<ContentCopyIcon />}>Copy</Button>
        <Button onClick={() => bulkDelete()} startIcon={<DeleteIcon />}>Clear select</Button>
        <Button onClick={() => bulkExport('json')} startIcon={<DownloadIcon />}>Export JSON</Button>
        <Button onClick={() => bulkExport('html')} startIcon={<DownloadIcon />}>Export HTML</Button>
        <Button onClick={() => bulkExport('md')} startIcon={<DownloadIcon />}>Export MD</Button>
      </Stack>
      {sortedItems.map((item, idx) => (
        <Card key={item._id} variant={idx === activeIndex ? 'elevation' : 'outlined'}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Checkbox checked={selectedIds.includes(item._id)} onChange={() => setSelectedIds((prev) => prev.includes(item._id) ? prev.filter((x) => x !== item._id) : [...prev, item._id])} />
                <Typography variant="h6">{item.title}</Typography>
                <Chip size="small" label={tags[item._id] ?? 'untagged'} />
              </Stack>
              <IconButton onClick={() => togglePin(item._id)} color={pinnedIds.includes(item._id) ? 'primary' : 'default'}><PushPinIcon /></IconButton>
            </Stack>
            <Stack direction="row" spacing={1} mb={1}>
              {(['bug', 'design', 'qa'] as FilterTag[]).map((tag) => <Chip key={tag} label={tag} onClick={() => { const next = { ...tags, [item._id]: tag }; setTags(next); localStorage.setItem(TAG_KEY, JSON.stringify(next)); }} size="small" />)}
            </Stack>
            <Typography variant="body2">{item.url}</Typography>
            <CaptureTabs item={item} compareItem={compareItem} />
          </CardContent>
        </Card>
      ))}
      <Dialog open={paletteOpen} onClose={() => setPaletteOpen(false)}>
        <DialogTitle>Shortcut Palette</DialogTitle>
        <DialogContent>
          <Typography>/ : open palette</Typography>
          <Typography>j/k : move selection</Typography>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
