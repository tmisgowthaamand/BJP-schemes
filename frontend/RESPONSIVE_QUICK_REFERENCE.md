# 📱 Responsive Design Quick Reference

## Screen Size Breakpoints

| Device Type | Min Width | Max Width | Description |
|-------------|-----------|-----------|-------------|
| Mobile Small | - | 320px | iPhone SE, small phones |
| Mobile Standard | - | 599px | iPhone 12/13/14, Android |
| Tablet Portrait | 600px | 767px | iPad Mini portrait |
| Tablet Landscape | 768px | 1023px | iPad, tablets landscape |
| Small Desktop | 1024px | 1279px | Laptops, small monitors |
| Standard Desktop | 1280px | 1439px | Desktop monitors |
| Large Desktop | 1440px | 1919px | Large monitors |
| Extra Large (4K) | 1920px | - | 4K, ultra-wide displays |

---

## Quick CSS Classes

### Visibility
```css
.hide-mobile     /* Hidden on mobile (< 768px) */
.hide-tablet     /* Hidden on tablet (768-1023px) */
.hide-desktop    /* Hidden on desktop (>= 1024px) */

.show-mobile     /* Visible only on mobile */
.show-tablet     /* Visible only on tablet */
.show-desktop    /* Visible only on desktop */
```

### Layout
```css
.flex-mobile-column   /* Column layout on mobile */
.flex-tablet-wrap     /* Wrap on tablets */
```

### Spacing
```css
.p-responsive    /* Responsive padding (24px → 16px on mobile) */
.mb-responsive   /* Responsive margin-bottom */
```

---

## Component Behavior

### Sidebar
- **Desktop (1024px+)**: Sticky sidebar, always visible
- **Tablet (768-1023px)**: Collapsible, 220-240px width
- **Mobile (< 768px)**: Hidden, accessible via FAB button

### Stats Grid
- **Mobile**: 1 column (full width)
- **Tablet**: 2-3 columns
- **Desktop**: 3-4 columns
- **4K**: 4+ columns

### Tables
- **Mobile/Tablet**: Horizontal scroll
- **Desktop**: Full width, no scroll

### Filters
- **Mobile**: Stacked vertically
- **Tablet**: 2-column wrap
- **Desktop**: Horizontal row

---

## React Component Usage

### Import Mobile Menu
```jsx
import MobileMenuToggle from '../../components/MobileMenuToggle';

// In render:
<MobileMenuToggle />
```

### Responsive Styles in JSX
```jsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '16px'
}}>
  {/* Auto-responsive grid */}
</div>
```

### Inline Media Queries
```jsx
<style>{`
  @media (max-width: 599px) {
    .my-component { padding: 16px; }
  }
`}</style>
```

---

## Touch Target Standards

| Element | Mobile Size | Desktop Size |
|---------|-------------|--------------|
| Buttons | 44px min | 36px min |
| Inputs | 44px min | 40px min |
| Icons | 24px | 20px |
| Touch zones | 44x44px | - |

---

## Typography Scaling

| Class | Desktop | Tablet | Mobile |
|-------|---------|--------|--------|
| .text-display | 52px | 40px | 32px |
| .text-heading | 28px | 24px | 22px |
| .text-heading-sm | 20px | 18px | 18px |
| .text-subheading | 16px | 15px | 14px |
| .text-body | 14px | 13px | 13px |

---

## Performance Tips

1. **Use `box-sizing: border-box`** everywhere
2. **Avoid fixed widths** - use max-width instead
3. **Test on real devices**, not just emulators
4. **Use CSS Grid/Flexbox** for layouts
5. **Optimize images** - use WebP format
6. **Minimize reflows** - batch DOM updates
7. **Use transform** for animations (GPU-accelerated)

---

## Testing Checklist

### Mobile (< 600px)
- [ ] Sidebar hidden by default
- [ ] FAB button visible and functional
- [ ] No horizontal scroll
- [ ] All text readable (min 12px)
- [ ] Touch targets >= 44px
- [ ] Forms usable without zoom

### Tablet (600-1023px)
- [ ] Sidebar collapsible
- [ ] 2-3 column grids work
- [ ] Tables scroll smoothly
- [ ] Both orientations work

### Desktop (1024px+)
- [ ] Sidebar always visible
- [ ] Full feature set accessible
- [ ] No layout shifts
- [ ] Optimal spacing

---

## Common Fixes

### Horizontal Scroll Issue
```css
body, html {
  overflow-x: hidden;
  max-width: 100vw;
}
```

### Text Too Small on Mobile
```css
@media (max-width: 599px) {
  body { font-size: 14px; }
}
```

### iOS Input Zoom
```css
input, select, textarea {
  font-size: 16px; /* Prevents zoom on iOS */
}
```

### Sidebar Not Hiding
```css
@media (max-width: 1023px) {
  aside { 
    position: fixed;
    left: -100%;
    transition: left 0.3s;
  }
  .mobile-menu-active aside {
    left: 0;
  }
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/styles/responsive-admin.css` | Main responsive styles |
| `src/components/MobileMenuToggle.jsx` | Mobile menu component |
| `src/index.css` | Imports responsive styles |
| All admin dashboards | Include MobileMenuToggle |

---

## Browser DevTools Testing

### Chrome DevTools
1. Press `F12` or `Cmd+Opt+I`
2. Click "Toggle Device Toolbar" (Cmd+Shift+M)
3. Select device or custom dimensions
4. Test different screen sizes

### Responsive Dimensions to Test
- 320px (iPhone SE)
- 375px (iPhone 12/13)
- 428px (iPhone 14 Pro Max)
- 768px (iPad Mini)
- 820px (iPad Air)
- 1024px (iPad Pro)
- 1280px (MacBook)
- 1440px (Desktop)
- 1920px (4K)

---

## Accessibility Quick Check

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast >= 4.5:1
- [ ] Touch targets >= 44x44px
- [ ] No zoom disabled on inputs
- [ ] Screen reader compatible

---

## Need Help?

1. Check `RESPONSIVE_ADMIN_DOCUMENTATION.md` for details
2. Review `src/styles/responsive-admin.css` for media queries
3. Inspect with browser DevTools
4. Test on actual device if possible
