import {FC} from 'react';
import {useParams} from 'react-router-dom';
import {YjsProvider} from 'common/yjs/context';
import {PanelLoad} from './Load';
import {useYjsListener} from 'common/yjs/event';
import {AnnoProvider} from 'state/annotate/annotation-provider';

const Panel: FC = () => {
  const {videoId: id = ''} = useParams();
  if (!id) {
    return <div />;
  }

  return (
    <YjsProvider>
      <AnnoProvider>
        <PanelLoad id={id} />
        <YjsListener />
      </AnnoProvider>
    </YjsProvider>
  );
};

function YjsListener() {
  useYjsListener();
  return null;
}

export default Panel;
