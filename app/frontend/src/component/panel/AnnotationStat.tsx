import {FC, useMemo} from 'react';
import intl from 'react-intl-universal';
import {Descriptions} from 'antd';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useVisibleEntities} from 'common/render';

export const AnnotationStat: FC = () => {
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const entities = useVisibleEntities();
  const [sliceComponentCount, sliceEntityCount, totalEntityCount] = useMemo(() => {
    let [cn, en] = [0, 0];
    for (const [, e] of Object.entries(entities)) {
      const slice = e.geometry.slices[sliceIndex] ?? {};
      const n = Object.entries(slice).length;
      cn += n;
      if (n > 0) {
        en++;
      }
    }
    return [cn, en, Object.entries(entities).length];
  }, [entities, sliceIndex]);
  return (
    <Descriptions column={1} style={{width: 240}} bordered={true} size="small">
      <Descriptions.Item label={intl.get('component_count_in_frame')}>{sliceComponentCount}</Descriptions.Item>
      <Descriptions.Item label={intl.get('entity_count_in_frame')}>{sliceEntityCount}</Descriptions.Item>
      <Descriptions.Item label={intl.get('entity_count_in_total')}>{totalEntityCount}</Descriptions.Item>
    </Descriptions>
  );
};
