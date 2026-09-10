/* @ds-bundle: {"format":4,"namespace":"ProvidentEstateDesignSystem_fefe98","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"IconButton","sourcePath":"components/actions/IconButton.jsx"},{"name":"Wordmark","sourcePath":"components/brand/Wordmark.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Eyebrow","sourcePath":"components/display/Eyebrow.jsx"},{"name":"Stat","sourcePath":"components/display/Stat.jsx"},{"name":"Tabs","sourcePath":"components/display/Tabs.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"b8be782a5ec8","components/actions/IconButton.jsx":"3e6f093a4058","components/brand/Wordmark.jsx":"ac09c3d329b6","components/display/Badge.jsx":"b8bca757d167","components/display/Card.jsx":"6813ca877ff1","components/display/Eyebrow.jsx":"02bd84761446","components/display/Stat.jsx":"1feb601f1a3e","components/display/Tabs.jsx":"83b288fe6e0c","components/display/Tag.jsx":"017d0c7d0ec3","components/feedback/Dialog.jsx":"11bbba9486f5","components/feedback/Toast.jsx":"6a4db84bb709","components/feedback/Tooltip.jsx":"35acbd6b38df","components/forms/Checkbox.jsx":"c771a5b03816","components/forms/Input.jsx":"fcc5b91536ac","components/forms/Radio.jsx":"9f951312177a","components/forms/Select.jsx":"65f129451f04","components/forms/Switch.jsx":"07270140f512"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ProvidentEstateDesignSystem_fefe98 = window.ProvidentEstateDesignSystem_fefe98 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Provident CTA — navy fill, GSF Medium 500, sentence case. Never orange. */
function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  children,
  style,
  ...rest
}) {
  const pad = {
    sm: '7px 16px',
    md: '11px 22px',
    lg: '14px 28px'
  }[size];
  const fs = {
    sm: 14,
    md: 16,
    lg: 17
  }[size];
  const variants = {
    primary: {
      background: 'var(--btn-fill)',
      color: '#fff',
      border: '1px solid var(--btn-fill)'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--deep-navy)',
      border: '1px solid var(--deep-navy)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--provident-navy)',
      border: '1px solid transparent'
    }
  };
  const [hover, setHover] = React.useState(false);
  const hoverFx = hover && !disabled ? variant === 'primary' ? {
    background: 'var(--btn-fill-hover)',
    borderColor: 'var(--btn-fill-hover)'
  } : {
    background: 'var(--cream)'
  } : {};
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: fs,
      padding: pad,
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--dur-quick) var(--ease-brand)',
      ...variants[variant],
      ...hoverFx,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Square icon-only button. Icons: Material Symbols Outlined (host page must link the CDN stylesheet). */
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled,
  style,
  ...rest
}) {
  const dim = {
    sm: 32,
    md: 40,
    lg: 48
  }[size];
  const variants = {
    primary: {
      background: 'var(--btn-fill)',
      color: '#fff',
      border: '1px solid var(--btn-fill)'
    },
    secondary: {
      background: 'transparent',
      color: 'var(--deep-navy)',
      border: '1px solid var(--stone)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--provident-navy)',
      border: '1px solid transparent'
    }
  };
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": label,
    title: label,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: dim,
      height: dim,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--dur-quick) var(--ease-brand)',
      ...(hover && !disabled ? {
        background: variant === 'primary' ? 'var(--btn-fill-hover)' : 'var(--cream)'
      } : {}),
      ...variants[variant],
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined",
    style: {
      fontSize: dim * 0.55
    }
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/brand/Wordmark.jsx
try { (() => {
/** The Provident wordmark, typeset live: GSF Light, lowercase, 0.04em, orange dot. */
function Wordmark({
  size = 32,
  color,
  onDark = false,
  style
}) {
  const c = color || (onDark ? '#FFFFFF' : 'var(--deep-navy)');
  const dot = onDark ? c : 'var(--orange)'; /* no orange on blue, ever */
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      letterSpacing: 'var(--ls-wordmark)',
      fontSize: size,
      lineHeight: 1,
      color: c,
      whiteSpace: 'nowrap',
      ...style
    }
  }, "provident", /*#__PURE__*/React.createElement("span", {
    style: {
      color: dot
    }
  }, "."));
}
Object.assign(__ds_scope, { Wordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Wordmark.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
/** Small status marker. tone: navy | brass | muted. */
function Badge({
  tone = 'navy',
  children,
  style
}) {
  const tones = {
    navy: {
      background: 'var(--deep-navy)',
      color: '#fff'
    },
    brass: {
      background: 'var(--brass)',
      color: '#fff'
    },
    muted: {
      background: 'var(--mist)',
      color: 'var(--provident-navy)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 11.5,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      display: 'inline-block',
      ...tones[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Surface card — white, soft navy shadow, 16px radius. */
function Card({
  padding = 24,
  elevated = false,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: elevated ? 'var(--shadow-raised)' : 'var(--shadow-card)',
      border: '1px solid var(--border-subtle)',
      padding,
      fontFamily: 'var(--font-sans)',
      color: 'var(--deep-navy)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Eyebrow.jsx
try { (() => {
/** Tracked-caps label above headings — GSF Medium, Brass on light, Gold on slides/navy. */
function Eyebrow({
  onDark = false,
  gold = false,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      fontSize: 'var(--text-eyebrow)',
      letterSpacing: 'var(--ls-eyebrow)',
      textTransform: 'uppercase',
      color: gold ? 'var(--gold)' : onDark ? 'var(--text-on-dark-label)' : 'var(--brass)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/display/Stat.jsx
try { (() => {
/** Staged figure — the key number lifted out large (GSF Light), affix smaller in Provident Navy. */
function Stat({
  value,
  prefix,
  suffix,
  label,
  onDark = false,
  style
}) {
  const main = onDark ? '#fff' : 'var(--deep-navy)';
  const affix = onDark ? 'var(--mist)' : 'var(--provident-navy)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 300,
      fontSize: 'var(--text-stat)',
      letterSpacing: 'var(--ls-stat)',
      lineHeight: 1.1,
      color: main
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.55em',
      color: affix,
      marginRight: 4
    }
  }, prefix), value, suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.55em',
      color: affix,
      marginLeft: 4
    }
  }, suffix)), label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      fontSize: 12.5,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      color: onDark ? 'var(--text-on-dark-label)' : 'var(--muted)',
      marginTop: 6
    }
  }, label));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Stat.jsx", error: String((e && e.message) || e) }); }

// components/display/Tabs.jsx
try { (() => {
/** Underline tabs — GSF Medium, navy indicator. items: string[]. */
function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  style
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]);
  const active = value !== undefined ? value : internal;
  const pick = it => {
    if (value === undefined) setInternal(it);
    onChange && onChange(it);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it,
    onClick: () => pick(it),
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '10px 2px',
      fontFamily: 'inherit',
      fontSize: 15,
      fontWeight: 500,
      color: it === active ? 'var(--deep-navy)' : 'var(--muted)',
      borderBottom: '2px solid ' + (it === active ? 'var(--deep-navy)' : 'transparent'),
      marginBottom: -1,
      transition: 'color var(--dur-quick) var(--ease-brand)'
    }
  }, it)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
/** Filter/attribute chip. */
function Tag({
  selected = false,
  onClick,
  children,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 400,
      fontSize: 14,
      padding: '6px 14px',
      borderRadius: 'var(--radius-pill)',
      cursor: onClick ? 'pointer' : 'default',
      display: 'inline-block',
      transition: 'all var(--dur-quick) var(--ease-brand)',
      background: selected ? 'var(--deep-navy)' : hover && onClick ? 'var(--mist)' : 'var(--cream)',
      color: selected ? '#fff' : 'var(--provident-navy)',
      border: '1px solid ' + (selected ? 'var(--deep-navy)' : 'var(--border-subtle)'),
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/** Modal dialog on a navy scrim. */
function Dialog({
  open,
  onClose,
  title,
  actions,
  children,
  width = 440
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(26,41,66,.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: '#fff',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-raised)',
      width,
      maxWidth: '90vw',
      padding: 28
    }
  }, title && /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 12px',
      fontWeight: 400,
      fontSize: 24,
      letterSpacing: '-.01em',
      color: 'var(--deep-navy)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 300,
      fontSize: 16,
      lineHeight: 1.6,
      color: 'var(--provident-navy)'
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 24
    }
  }, actions)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/** Transient confirmation — deep navy bar, white text. */
function Toast({
  open = true,
  children,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--deep-navy)',
      color: '#fff',
      fontFamily: 'var(--font-sans)',
      fontWeight: 400,
      fontSize: 15,
      padding: '12px 20px',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-raised)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--mist)',
      flexShrink: 0
    }
  }), children);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/** Hover tooltip — charcoal, small GSF. */
function Tooltip({
  label,
  children
}) {
  const [show, setShow] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-block'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translate(-50%,-6px)',
      background: 'var(--charcoal)',
      color: '#fff',
      fontFamily: 'var(--font-sans)',
      fontWeight: 400,
      fontSize: 12.5,
      padding: '6px 10px',
      borderRadius: 'var(--radius-sm)',
      whiteSpace: 'nowrap',
      zIndex: 50
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled,
  style
}) {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isOn = checked !== undefined ? checked : internal;
  const toggle = e => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e);
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 15,
      color: 'var(--deep-navy)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: isOn,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 4,
      flexShrink: 0,
      border: '1.5px solid ' + (isOn ? 'var(--deep-navy)' : 'var(--stone)'),
      background: isOn ? 'var(--deep-navy)' : '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--dur-quick) var(--ease-brand)'
    }
  }, isOn && /*#__PURE__*/React.createElement("svg", {
    width: "10",
    height: "8",
    viewBox: "0 0 10 8",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 4l2.5 2.5L9 1",
    stroke: "#fff",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text input — GSF Light 17px, white field, stone border, navy focus. */
function Input({
  label,
  hint,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--deep-navy)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: 'inherit',
      fontWeight: 300,
      fontSize: 17,
      color: 'var(--deep-navy)',
      background: '#fff',
      border: '1px solid ' + (focus ? 'var(--deep-navy)' : 'var(--stone)'),
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      outline: 'none',
      transition: 'border-color var(--dur-quick) var(--ease-brand)'
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 300,
      color: 'var(--muted)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  label,
  name,
  value,
  checked,
  onChange,
  disabled,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 15,
      color: 'var(--deep-navy)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      flexShrink: 0,
      border: '1.5px solid ' + (checked ? 'var(--deep-navy)' : 'var(--stone)'),
      background: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all var(--dur-quick) var(--ease-brand)'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: 'var(--deep-navy)'
    }
  })), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native select styled to the form system. options: array of strings or {value,label}. */
function Select({
  label,
  options = [],
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--deep-navy)'
    }
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: 'inherit',
      fontWeight: 300,
      fontSize: 17,
      color: 'var(--deep-navy)',
      background: '#fff',
      border: '1px solid ' + (focus ? 'var(--deep-navy)' : 'var(--stone)'),
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      outline: 'none'
    }
  }, rest), options.map(o => {
    const v = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v.value,
      value: v.value
    }, v.label);
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled,
  style
}) {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isOn = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInternal(!isOn);
    onChange && onChange(!isOn);
  };
  return /*#__PURE__*/React.createElement("label", {
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'var(--font-sans)',
      fontWeight: 300,
      fontSize: 15,
      color: 'var(--deep-navy)',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    role: "switch",
    "aria-checked": isOn,
    style: {
      width: 38,
      height: 22,
      borderRadius: 11,
      background: isOn ? 'var(--deep-navy)' : 'var(--stone)',
      position: 'relative',
      transition: 'background var(--dur-quick) var(--ease-brand)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: isOn ? 18 : 2,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      transition: 'left var(--dur-quick) var(--ease-brand)',
      boxShadow: '0 1px 2px rgba(26,41,66,.2)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Wordmark = __ds_scope.Wordmark;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

})();
