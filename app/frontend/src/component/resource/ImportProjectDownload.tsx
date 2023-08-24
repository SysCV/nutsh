import {FC, useState} from 'react';
import {Alert, Button, Progress, Result, Typography} from 'antd';
import intl from 'react-intl-universal';
import {ImportProjectReq} from 'openapi/nutsh';

const {Text} = Typography;

export type Reason = 'oom' | 'manual';
export type Props = React.ComponentProps<'div'> & {
  request: ImportProjectReq;
  reason: Reason;
};

export const ImportProjectDownload: FC<Props> = ({request, reason, ...baseProps}) => {
  const [filename, setFilename] = useState<string | undefined>(undefined);
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const forError = reason === 'oom';
  return (
    <div {...baseProps}>
      {filename && downloadPercent === 100 ? (
        <Result
          status="success"
          title={intl.get('download_completed_successfully')}
          subTitle={intl.get('download_completed_successfully.message')}
          style={{textAlign: 'center'}}
        >
          <Text code copyable>{`nutsh import -d "${filename}"`}</Text>
        </Result>
      ) : (
        <>
          <Alert
            showIcon={true}
            type={forError ? 'error' : 'success'}
            message={forError ? intl.get('error.oom') : intl.get('import_data_ready')}
            description={forError ? intl.get('error.import_project_oom_message') : intl.get('import_data_ready_extra')}
            action={
              <Button
                disabled={downloadPercent > 0}
                loading={downloadPercent > 0}
                type="primary"
                onClick={() => downloadImportRequest(request, setDownloadPercent).then(setFilename)}
              >
                {intl.get('download')}
              </Button>
            }
          />
          {downloadPercent > 0 && <Progress percent={downloadPercent} showInfo={false} />}
        </>
      )}
    </div>
  );
};

// Reference: https://web.dev/streams/
function downloadImportRequest(
  req: ImportProjectReq,
  onPercentUpdate: (downloadPercent: number) => void
): Promise<string> {
  const total = Object.keys(req.annotations ?? {}).length + 2;
  let finished = 0;
  function advanceFinished() {
    finished++;
    onPercentUpdate((finished / total) * 100.0);
  }

  function* serializeImportProjectReq(req?: ImportProjectReq) {
    if (!req) {
      yield '{}';
      return;
    }

    yield `{"project": ${JSON.stringify(req.project)}`;
    advanceFinished();

    yield `,"videos": ${JSON.stringify(req.videos)}`;
    advanceFinished();

    if (!req.annotations) {
      yield '}';
      return;
    }

    yield ',"annotations":{';
    let idx = 0;
    for (const [key, value] of Object.entries(req.annotations)) {
      if (idx > 0) {
        yield ',';
      }
      idx++;
      yield `"${key}":${JSON.stringify(value)}`;
      advanceFinished();
    }
    yield '}';

    yield '}';
  }

  return new Promise<string>(resolve => {
    const gen = serializeImportProjectReq(req);
    const objectStream = new ReadableStream({
      pull(controller) {
        const {value, done} = gen.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      },
    });

    showSaveFilePicker({
      suggestedName: `${req.project.name}.json.gz`,
      types: [
        {
          description: 'GZIP File',
          accept: {
            'application/gzip': ['.gz'],
          },
        },
      ],
    }).then(handle => {
      handle.createWritable().then(writableStream => {
        objectStream
          .pipeThrough(new TextEncoderStream())
          .pipeThrough(new CompressionStream('gzip'))
          .pipeTo(writableStream)
          .then(() => resolve(handle.name));
      });
    });
  });
}
