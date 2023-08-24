import {FC} from 'react';
import {useParams} from 'react-router-dom';
import {PanelLoad} from './Load';

const Panel: FC = () => {
  const {videoId: id = ''} = useParams();
  if (!id) {
    return <div />;
  }

  return <PanelLoad id={id} />;
};

export default Panel;
