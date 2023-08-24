import {RcFile} from 'antd/es/upload';

export function downloadFile(content: string, fileName: string, contentType: string) {
  const a = document.createElement('a');
  const file = new Blob([content], {type: contentType});
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

export function decodeFile<T>(file: RcFile, decoder: (content: string) => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result?.toString();
      if (!content) {
        reject('error.missing_content');
        return;
      }
      try {
        const decoded = decoder(content);
        resolve(decoded);
      } catch (e) {
        console.error((e as Error).cause);
        reject('error.failed_to_parse_file');
        return;
      }
    };
    reader.onabort = e => {
      console.error(e);
      reject('error.failed_to_parse_file');
      return;
    };
    reader.onerror = e => {
      console.error(e);
      reject('error.failed_to_parse_file');
      return;
    };
    reader.readAsText(file);
  });
}
