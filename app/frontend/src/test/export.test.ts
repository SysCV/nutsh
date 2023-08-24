import {mustDecodeJsonStr as mustDecodeProjectSpecJsonStr} from 'type/project_spec';
import {mustDecodeJsonStr as mustDecodeAnnotationJsonStr} from 'type/annotation';
import {VideoAnnotation} from 'common/project';

import {mustConvert as mustExportScalabel} from 'common/project/scalabel/export';
import {mustConvert as mustImportScalabel} from 'common/project/scalabel/import';
import {exported as truthScalabel} from './data/exported/scalabel';

import {mustConvert as mustExportNutsh} from 'common/project/nutsh/export';
import {mustConvert as mustImportNutsh} from 'worker/import';
import {exported as truthNutsh} from './data/exported/nutsh';

describe('export', () => {
  test('Nutsh', () => {
    const {annotations, project, videos} = mustImportNutsh(truthNutsh, {name: 'Project', remark: ''});
    const videoAnnos: VideoAnnotation[] =
      videos?.map(({name, frame_urls}) => {
        const a = annotations?.[name];
        return {
          video: {name},
          frameUrls: frame_urls,
          annotation: a ? mustDecodeAnnotationJsonStr(a) : undefined,
        };
      }) ?? [];
    const projectSpec = mustDecodeProjectSpecJsonStr(project.spec_json);
    const exported = mustExportNutsh(projectSpec, videoAnnos);
    expect(exported).toStrictEqual(truthNutsh);
  });

  test('Scalabel', async () => {
    const {annotations, project, videos} = await mustImportScalabel(truthScalabel, {name: 'Project', remark: ''});
    const videoAnnos: VideoAnnotation[] =
      videos?.map(({name, frame_urls}) => {
        const a = annotations?.[name];
        return {
          video: {name},
          frameUrls: frame_urls,
          annotation: a ? mustDecodeAnnotationJsonStr(a) : undefined,
        };
      }) ?? [];
    const projectSpec = mustDecodeProjectSpecJsonStr(project.spec_json);
    const exported = mustExportScalabel(projectSpec, videoAnnos);
    expect(exported).toStrictEqual(truthScalabel);
  });
});
