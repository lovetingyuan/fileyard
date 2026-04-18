import type { ComponentType, SVGProps } from "react";
import MdiAndroid from "~icons/mdi/android";
import MdiApple from "~icons/mdi/apple";
import MdiApplicationCog from "~icons/mdi/application-cog";
import MdiCodeBraces from "~icons/mdi/code-braces";
import MdiCodeJson from "~icons/mdi/code-json";
import MdiConsole from "~icons/mdi/console";
import MdiCubeOutline from "~icons/mdi/cube-outline";
import MdiDatabase from "~icons/mdi/database";
import MdiDisc from "~icons/mdi/disc";
import MdiFileClock from "~icons/mdi/file-clock";
import MdiFileCode from "~icons/mdi/file-code";
import MdiFileCog from "~icons/mdi/file-cog";
import MdiFileDocumentOutline from "~icons/mdi/file-document-outline";
import MdiFileExcel from "~icons/mdi/file-excel";
import MdiFileImage from "~icons/mdi/file-image";
import MdiFileLock from "~icons/mdi/file-lock";
import MdiFileMusic from "~icons/mdi/file-music";
import MdiFileOutline from "~icons/mdi/file-outline";
import MdiFilePdfBox from "~icons/mdi/file-pdf-box";
import MdiFilePowerpoint from "~icons/mdi/file-powerpoint";
import MdiFileRestore from "~icons/mdi/file-restore";
import MdiFileVideo from "~icons/mdi/file-video";
import MdiFileWord from "~icons/mdi/file-word";
import MdiFileXmlBox from "~icons/mdi/file-xml-box";
import MdiFolderZip from "~icons/mdi/folder-zip";
import MdiFormatFont from "~icons/mdi/format-font";
import MdiLanguageC from "~icons/mdi/language-c";
import MdiLanguageCpp from "~icons/mdi/language-cpp";
import MdiLanguageCsharp from "~icons/mdi/language-csharp";
import MdiLanguageCss3 from "~icons/mdi/language-css3";
import MdiLanguageGo from "~icons/mdi/language-go";
import MdiLanguageHtml5 from "~icons/mdi/language-html5";
import MdiLanguageJava from "~icons/mdi/language-java";
import MdiLanguageJavascript from "~icons/mdi/language-javascript";
import MdiLanguageKotlin from "~icons/mdi/language-kotlin";
import MdiLanguageLua from "~icons/mdi/language-lua";
import MdiLanguageMarkdown from "~icons/mdi/language-markdown";
import MdiLanguagePhp from "~icons/mdi/language-php";
import MdiLanguagePython from "~icons/mdi/language-python";
import MdiLanguageR from "~icons/mdi/language-r";
import MdiLanguageRuby from "~icons/mdi/language-ruby";
import MdiLanguageRust from "~icons/mdi/language-rust";
import MdiLanguageSwift from "~icons/mdi/language-swift";
import MdiLanguageTypescript from "~icons/mdi/language-typescript";
import MdiMagnet from "~icons/mdi/magnet";
import MdiPowershell from "~icons/mdi/powershell";
import MdiVuejs from "~icons/mdi/vuejs";

type FileIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type FileIcon = {
  Icon: FileIconComponent;
  color: string;
};

const FILE_ICON_MAP: Record<string, FileIcon> = {
  // Images
  jpg: { Icon: MdiFileImage, color: "text-purple-500" },
  jpeg: { Icon: MdiFileImage, color: "text-purple-500" },
  png: { Icon: MdiFileImage, color: "text-purple-500" },
  gif: { Icon: MdiFileImage, color: "text-purple-500" },
  bmp: { Icon: MdiFileImage, color: "text-purple-500" },
  svg: { Icon: MdiFileImage, color: "text-purple-500" },
  webp: { Icon: MdiFileImage, color: "text-purple-500" },
  ico: { Icon: MdiFileImage, color: "text-purple-500" },
  tiff: { Icon: MdiFileImage, color: "text-purple-500" },
  tif: { Icon: MdiFileImage, color: "text-purple-500" },
  avif: { Icon: MdiFileImage, color: "text-purple-500" },
  heic: { Icon: MdiFileImage, color: "text-purple-500" },
  heif: { Icon: MdiFileImage, color: "text-purple-500" },
  raw: { Icon: MdiFileImage, color: "text-purple-500" },
  psd: { Icon: MdiFileImage, color: "text-blue-400" },
  ai: { Icon: MdiFileImage, color: "text-orange-500" },
  // PDF
  pdf: { Icon: MdiFilePdfBox, color: "text-red-500" },
  // Documents
  doc: { Icon: MdiFileWord, color: "text-blue-600" },
  docx: { Icon: MdiFileWord, color: "text-blue-600" },
  odt: { Icon: MdiFileWord, color: "text-blue-600" },
  rtf: { Icon: MdiFileWord, color: "text-blue-600" },
  // Spreadsheets
  xls: { Icon: MdiFileExcel, color: "text-green-600" },
  xlsx: { Icon: MdiFileExcel, color: "text-green-600" },
  csv: { Icon: MdiFileExcel, color: "text-green-600" },
  ods: { Icon: MdiFileExcel, color: "text-green-600" },
  tsv: { Icon: MdiFileExcel, color: "text-green-600" },
  // Presentations
  ppt: { Icon: MdiFilePowerpoint, color: "text-orange-600" },
  pptx: { Icon: MdiFilePowerpoint, color: "text-orange-600" },
  odp: { Icon: MdiFilePowerpoint, color: "text-orange-600" },
  key: { Icon: MdiFilePowerpoint, color: "text-orange-600" },
  // Video
  mp4: { Icon: MdiFileVideo, color: "text-pink-500" },
  avi: { Icon: MdiFileVideo, color: "text-pink-500" },
  mov: { Icon: MdiFileVideo, color: "text-pink-500" },
  mkv: { Icon: MdiFileVideo, color: "text-pink-500" },
  wmv: { Icon: MdiFileVideo, color: "text-pink-500" },
  flv: { Icon: MdiFileVideo, color: "text-pink-500" },
  webm: { Icon: MdiFileVideo, color: "text-pink-500" },
  m4v: { Icon: MdiFileVideo, color: "text-pink-500" },
  "3gp": { Icon: MdiFileVideo, color: "text-pink-500" },
  // Audio
  mp3: { Icon: MdiFileMusic, color: "text-teal-500" },
  wav: { Icon: MdiFileMusic, color: "text-teal-500" },
  flac: { Icon: MdiFileMusic, color: "text-teal-500" },
  aac: { Icon: MdiFileMusic, color: "text-teal-500" },
  ogg: { Icon: MdiFileMusic, color: "text-teal-500" },
  wma: { Icon: MdiFileMusic, color: "text-teal-500" },
  m4a: { Icon: MdiFileMusic, color: "text-teal-500" },
  opus: { Icon: MdiFileMusic, color: "text-teal-500" },
  mid: { Icon: MdiFileMusic, color: "text-teal-500" },
  midi: { Icon: MdiFileMusic, color: "text-teal-500" },
  // Archives
  zip: { Icon: MdiFolderZip, color: "text-yellow-600" },
  rar: { Icon: MdiFolderZip, color: "text-yellow-600" },
  "7z": { Icon: MdiFolderZip, color: "text-yellow-600" },
  tar: { Icon: MdiFolderZip, color: "text-yellow-600" },
  gz: { Icon: MdiFolderZip, color: "text-yellow-600" },
  bz2: { Icon: MdiFolderZip, color: "text-yellow-600" },
  xz: { Icon: MdiFolderZip, color: "text-yellow-600" },
  zst: { Icon: MdiFolderZip, color: "text-yellow-600" },
  iso: { Icon: MdiDisc, color: "text-yellow-600" },
  dmg: { Icon: MdiDisc, color: "text-yellow-600" },
  // Code
  js: { Icon: MdiLanguageJavascript, color: "text-yellow-400" },
  mjs: { Icon: MdiLanguageJavascript, color: "text-yellow-400" },
  cjs: { Icon: MdiLanguageJavascript, color: "text-yellow-400" },
  ts: { Icon: MdiLanguageTypescript, color: "text-blue-500" },
  tsx: { Icon: MdiLanguageTypescript, color: "text-blue-500" },
  jsx: { Icon: MdiLanguageJavascript, color: "text-yellow-400" },
  py: { Icon: MdiLanguagePython, color: "text-blue-400" },
  java: { Icon: MdiLanguageJava, color: "text-red-400" },
  kt: { Icon: MdiLanguageKotlin, color: "text-purple-400" },
  swift: { Icon: MdiLanguageSwift, color: "text-orange-500" },
  c: { Icon: MdiLanguageC, color: "text-blue-500" },
  cpp: { Icon: MdiLanguageCpp, color: "text-blue-600" },
  h: { Icon: MdiLanguageC, color: "text-blue-500" },
  hpp: { Icon: MdiLanguageCpp, color: "text-blue-600" },
  cs: { Icon: MdiLanguageCsharp, color: "text-green-500" },
  go: { Icon: MdiLanguageGo, color: "text-cyan-500" },
  rs: { Icon: MdiLanguageRust, color: "text-orange-700" },
  rb: { Icon: MdiLanguageRuby, color: "text-red-500" },
  php: { Icon: MdiLanguagePhp, color: "text-indigo-400" },
  lua: { Icon: MdiLanguageLua, color: "text-blue-600" },
  r: { Icon: MdiLanguageR, color: "text-blue-400" },
  dart: { Icon: MdiCodeBraces, color: "text-cyan-500" },
  scala: { Icon: MdiCodeBraces, color: "text-red-500" },
  // Web
  html: { Icon: MdiLanguageHtml5, color: "text-orange-500" },
  htm: { Icon: MdiLanguageHtml5, color: "text-orange-500" },
  css: { Icon: MdiLanguageCss3, color: "text-blue-500" },
  scss: { Icon: MdiLanguageCss3, color: "text-pink-400" },
  sass: { Icon: MdiLanguageCss3, color: "text-pink-400" },
  less: { Icon: MdiLanguageCss3, color: "text-blue-400" },
  vue: { Icon: MdiVuejs, color: "text-green-500" },
  // Data / Config
  json: { Icon: MdiCodeJson, color: "text-yellow-500" },
  jsonc: { Icon: MdiCodeJson, color: "text-yellow-500" },
  xml: { Icon: MdiFileXmlBox, color: "text-orange-400" },
  yaml: { Icon: MdiFileCode, color: "text-red-400" },
  yml: { Icon: MdiFileCode, color: "text-red-400" },
  toml: { Icon: MdiFileCode, color: "text-gray-500" },
  ini: { Icon: MdiFileCog, color: "text-gray-500" },
  env: { Icon: MdiFileCog, color: "text-yellow-600" },
  // Shell / Scripts
  sh: { Icon: MdiConsole, color: "text-green-400" },
  bash: { Icon: MdiConsole, color: "text-green-400" },
  zsh: { Icon: MdiConsole, color: "text-green-400" },
  bat: { Icon: MdiConsole, color: "text-gray-500" },
  cmd: { Icon: MdiConsole, color: "text-gray-500" },
  ps1: { Icon: MdiPowershell, color: "text-blue-500" },
  // Text / Docs
  txt: { Icon: MdiFileDocumentOutline, color: "text-gray-500" },
  md: { Icon: MdiLanguageMarkdown, color: "text-gray-600" },
  mdx: { Icon: MdiLanguageMarkdown, color: "text-gray-600" },
  log: { Icon: MdiFileDocumentOutline, color: "text-gray-400" },
  // Database
  sql: { Icon: MdiDatabase, color: "text-blue-400" },
  db: { Icon: MdiDatabase, color: "text-blue-400" },
  sqlite: { Icon: MdiDatabase, color: "text-blue-400" },
  // Fonts
  ttf: { Icon: MdiFormatFont, color: "text-gray-500" },
  otf: { Icon: MdiFormatFont, color: "text-gray-500" },
  woff: { Icon: MdiFormatFont, color: "text-gray-500" },
  woff2: { Icon: MdiFormatFont, color: "text-gray-500" },
  eot: { Icon: MdiFormatFont, color: "text-gray-500" },
  // Executables / Binaries
  exe: { Icon: MdiApplicationCog, color: "text-gray-600" },
  msi: { Icon: MdiApplicationCog, color: "text-gray-600" },
  deb: { Icon: MdiApplicationCog, color: "text-gray-600" },
  rpm: { Icon: MdiApplicationCog, color: "text-gray-600" },
  apk: { Icon: MdiAndroid, color: "text-green-500" },
  ipa: { Icon: MdiApple, color: "text-gray-600" },
  // 3D / CAD
  obj: { Icon: MdiCubeOutline, color: "text-orange-400" },
  stl: { Icon: MdiCubeOutline, color: "text-orange-400" },
  fbx: { Icon: MdiCubeOutline, color: "text-orange-400" },
  gltf: { Icon: MdiCubeOutline, color: "text-orange-400" },
  glb: { Icon: MdiCubeOutline, color: "text-orange-400" },
  // Misc
  lock: { Icon: MdiFileLock, color: "text-gray-500" },
  bak: { Icon: MdiFileRestore, color: "text-gray-400" },
  tmp: { Icon: MdiFileClock, color: "text-gray-400" },
  torrent: { Icon: MdiMagnet, color: "text-green-500" },
};

const DEFAULT_FILE_ICON: FileIcon = { Icon: MdiFileOutline, color: "text-info" };

export function getFileIcon(filename: string): FileIcon {
  const ext =
    filename.lastIndexOf(".") !== -1
      ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
      : "";
  return FILE_ICON_MAP[ext] ?? DEFAULT_FILE_ICON;
}
